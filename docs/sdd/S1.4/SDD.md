# SDD — S1.4 · Bloqueo tras 5 intentos y rate limit del login

- **Ticket:** ClickUp **S1.4** (`868mh1kve`, https://app.clickup.com/t/868mh1kve).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-01 CA2 (5 intentos → bloqueo de 15 min), RNF-10 (rate limit de 10/min por IP en el login)
  2. `docs/product/business-rules.md` §Seguridad
  3. `docs/decisions/LOG.md` — DEC-007, DEC-010 #1 (`parametro` con `MAX_INTENTOS_LOGIN` y `MIN_BLOQUEO_LOGIN`), DEC-011 (eventos de acceso), DEC-012 (contrato del login; el mismo 401 para todo rechazo)
  4. `docs/sdd/S1.3/SDD.md` §2.2 (flujo del login; aquí se completa el contador), `docs/sdd/S1.1/SDD.md` §2.1 (`valor` es texto; un valor inválido es un error, sin default silencioso)
  5. `docs/sdd/S0.4/SDD.md` y `apps/web/nginx/siset.conf` (IP real detrás de Nginx; `TRUST_PROXY=1`)
  6. `docs/adr/0001-monolito-modular.md` (`parametro` es del módulo `catalogos`)

---

## 1 · Alcance

### Entra

- Contador de intentos en el login: cada contraseña incorrecta suma 1. Al llegar a `MAX_INTENTOS_LOGIN` (5), la cuenta se bloquea `MIN_BLOQUEO_LOGIN` minutos (15) y se registra `BLOQUEO_CUENTA`. Un login correcto vuelve el contador a 0.
- Los dos valores se leen de la tabla `parametro` en cada intento: si Kardex los cambia más adelante, aplican al instante.
- Rate limit de 10 peticiones por minuto por IP en `POST /auth/login`, con respuesta 429 en el formato único.
- Primer código del módulo `catalogos`: la lectura de un parámetro entero.

### No entra (a propósito)

- **Desbloquear desde la API de usuarios** → S1.8, como dice el propio ticket. Allí se pone `bloqueado_hasta = null` e `intentos_fallidos = 0`, con su evento.
- Pantalla o API para editar parámetros → después del piloto.
- Rate limit en otras rutas (refresh, API general) → S1.5 y S6.7 (OWASP). El ticket pide solo el login.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                     | Qué hay de verdad en el repo                                                                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "5 intentos" y "15 min"                                | ✅ Ya existen como parámetros en la base (S1.1, DEC-010): se leen de ahí y no se escriben en el código.                                                              |
| Leer `parametro` desde `seguridad`                     | ⚠️ La tabla es de `catalogos`, que no tiene código. Se crea `catalogos` con `leerParametroEntero` y la raíz de composición lo inyecta, igual que `personas` en S1.3. |
| Rate limit "respetando `real_ip` de Nginx"             | ✅ Nginx reescribe `X-Forwarded-For` con la IP real y la API tiene `TRUST_PROXY=1` en Compose: `req.ip` ya es la IP del cliente.                                     |
| Hay una librería de rate limit                         | ❌ No hay ninguna. Se agrega **`express-rate-limit` 8.7.0** (MIT, publicada el 29-ago-2026; la 8.7.1 tiene menos de dos semanas y no se usa todavía).                |
| "Evento BLOQUEO en la bitácora"                        | ✅ `registrarBloqueo` (S1.7) → acción `BLOQUEO_CUENTA`.                                                                                                              |
| El test del 5.º intento y del login durante el bloqueo | ✅ Se apoya en `auth-login.test.ts` de S1.3. Ese archivo hace más de 10 logins por minuto: necesita poder subir el límite en los tests (§2.3).                       |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket       | API pública (`index.ts`)                                   | Tablas propias que toca                                      |
| ----------- | ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `seguridad` | dueño                    | sin cambios (`crearModuloAuth` recibe una dependencia más) | `usuario` (actualiza `intentos_fallidos`, `bloqueado_hasta`) |
| `catalogos` | dueño, **carpeta nueva** | **agrega** `leerParametroEntero`                           | `parametro` (lee)                                            |
| `auditoria` | consumido                | `registrarEvento` (vía S1.7)                               | `log_auditoria`                                              |

### 2.1 Reglas del contador

Completan el flujo de S1.3 §2.2. La respuesta al usuario no cambia: siempre el mismo 401 (DEC-012).

| Situación                                      | Contador     | Bloqueo                                                                       | Bitácora                                                                 |
| ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Contraseña incorrecta, cuenta **no** bloqueada | +1 (atómico) | Si llega a 5: `bloqueado_hasta = ahora + 15 min` y el contador **vuelve a 0** | `LOGIN_FALLIDO` con el valor nuevo; si bloquea, también `BLOQUEO_CUENTA` |
| Contraseña incorrecta, cuenta bloqueada        | no cambia    | no se extiende                                                                | `LOGIN_FALLIDO` `PASSWORD_INCORRECTA`                                    |
| Contraseña correcta, cuenta bloqueada          | no cambia    | sigue                                                                         | `LOGIN_FALLIDO` `CUENTA_BLOQUEADA` (como en S1.3)                        |
| Contraseña correcta, cuenta inactiva           | no cambia    | —                                                                             | `LOGIN_FALLIDO` `CUENTA_INACTIVA` (como en S1.3)                         |
| Login correcto                                 | vuelve a 0   | `bloqueado_hasta = null`                                                      | `LOGIN`                                                                  |

**Por qué así:**

- **El contador vuelve a 0 al bloquear.** Si no, al vencer el bloqueo el contador seguiría en 5 y el siguiente error volvería a bloquear al instante. Así, después de los 15 minutos, el usuario tiene otros 5 intentos.
- **Durante el bloqueo no se cuenta ni se extiende.** Si cada intento alargara el bloqueo, cualquiera que conozca un CI podría dejar a esa persona sin entrar indefinidamente. Con un bloqueo fijo, lo peor que puede hacer un atacante es un bloqueo de 15 minutos cada 5 intentos, y el rate limit por IP lo frena.
- **"Seguidos"** lo resuelve el regreso a 0 con el login correcto: no hay ventana de tiempo. Tres errores el lunes y dos el martes bloquean. Es lo que dice RF-01 y lo más simple de explicar.
- **Atómico:** el +1 es un `UPDATE … SET intentos_fallidos = intentos_fallidos + 1 RETURNING`. Con dos intentos simultáneos, cada uno ve su propio valor y no se pierde ninguno.
- **Una transacción por intento fallido:** el +1, el posible bloqueo y los eventos van juntos. Antes, `LOGIN_FALLIDO` usaba el cliente sin transacción (S1.3 §2.2); ahora tiene una operación a la que acompañar.
- En el login correcto, `registrarAcceso` también pone el contador en 0 y `bloqueado_hasta` en `null`, dentro de la transacción de S1.3.

### 2.2 Parámetros (`catalogos/parametro.repositorio.ts`)

```ts
/** Lee un parámetro entero positivo. Si falta o no es un entero > 0, lanza: es un error de configuración. */
export async function leerParametroEntero(cliente: ClienteBd | TransaccionBd, clave: ClaveParametro): Promise<number>;
export type ClaveParametro = 'MAX_INTENTOS_LOGIN' | 'MIN_BLOQUEO_LOGIN';
```

- Si el valor falta o es inválido, se lanza un `Error` común: el manejador lo convierte en 500 y lo deja en el log. No se toma un valor por defecto en silencio (S1.1 §2.1). La migración siembra los dos valores, así que solo pasa si alguien los rompe a mano.
- Se leen los dos parámetros **solo cuando la contraseña es incorrecta** (el único caso que los usa), con una consulta `IN` para las dos claves.
- `ClaveParametro` es una unión cerrada que crece con cada parámetro nuevo (`MAX_UF_REPROBADAS` en S2.x).

### 2.3 Rate limit (`seguridad/auth.rutas.ts`)

```ts
rateLimit({
  windowMs: 60_000,
  limit: config.loginLimitePorMinuto, // 10 por defecto (RNF-10)
  standardHeaders: 'draft-8', // RateLimit y RateLimit-Policy
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new ErrorDemasiadasPeticiones()),
});
```

- Se aplica **solo** a `POST /auth/login`, antes de `validar`: también cuentan las peticiones mal formadas.
- Cuenta **todas** las peticiones (correctas y fallidas): el ticket pide "10 peticiones por minuto". Para el personal, 10 ingresos por minuto desde una misma oficina no se alcanzan en un uso normal.
- La clave es `req.ip`, que detrás de Nginx ya es la IP real (§1). IPv6 se agrupa por `/56`, el comportamiento por defecto de la librería, para que no se pueda esquivar cambiando de dirección dentro de la misma red.
- **Nuevo error** en `compartido/errores`: `ErrorDemasiadasPeticiones` (429, código `DEMASIADAS_PETICIONES`, mensaje "Demasiados intentos. Espere un minuto y vuelva a intentar."). El formato único lo arma el manejador existente.
- **Almacenamiento en memoria:** hay una sola instancia de la API (Compose). Si se reinicia, el conteo vuelve a cero, lo que es aceptable para una ventana de un minuto. Con varias instancias haría falta un almacenamiento compartido (§6).
- **`LOGIN_LIMITE_POR_MINUTO`** (opcional, por defecto 10) en `config.ts`. Existe para que los tests de login puedan subirlo; en los servidores no se define.
- El limitador se crea dentro de `crearModuloAuth`, así cada app (y cada test) tiene su propio conteo.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                    | Cambio                                                                                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/package.json`, `package-lock.json`                      | + `express-rate-limit` 8.7.0 (versión exacta).                                                                                                                               |
| `apps/api/src/compartido/config.ts`                               | + `LOGIN_LIMITE_POR_MINUTO` (entero ≥ 1, por defecto 10) → `config.loginLimitePorMinuto`.                                                                                    |
| `apps/api/src/compartido/errores/errores.ts` (+ `index.ts`)       | + `ErrorDemasiadasPeticiones` (429).                                                                                                                                         |
| `apps/api/src/modulos/catalogos/{parametro.repositorio,index}.ts` | **Nuevos** (§2.2).                                                                                                                                                           |
| `apps/api/src/modulos/seguridad/usuario.repositorio.ts`           | + `sumarIntentoFallido` (atómico, devuelve el valor nuevo) y `bloquearCuenta(id, hasta)` (deja el contador en 0); `registrarAcceso` también limpia el contador y el bloqueo. |
| `apps/api/src/modulos/seguridad/auth.servicio.ts`                 | Rama de contraseña incorrecta según §2.1; recibe `leerParametro` por dependencia.                                                                                            |
| `apps/api/src/modulos/seguridad/auth.rutas.ts`, `auth.modulo.ts`  | Rate limit (§2.3); el router recibe el límite.                                                                                                                               |
| `apps/api/src/app.ts`                                             | Inyecta `leerParametroEntero` y el límite.                                                                                                                                   |
| `apps/api/test/http/utilidades.ts`                                | `configDePrueba` con `loginLimitePorMinuto`.                                                                                                                                 |
| `apps/api/test/bd/auth-login.test.ts`                             | La app de ese archivo usa un límite alto; los casos del contador del intento correcto se ajustan (§4).                                                                       |
| `apps/api/test/bd/auth-bloqueo.test.ts`                           | **Nuevo** (§4).                                                                                                                                                              |
| `apps/api/test/http/rate-limit-login.test.ts`                     | **Nuevo** (§4), sin base de datos.                                                                                                                                           |
| `apps/api/.env.example`                                           | Comentario de `LOGIN_LIMITE_POR_MINUTO` (opcional).                                                                                                                          |
| `docs/decisions/LOG.md`                                           | DEC-013 (§7).                                                                                                                                                                |

---

## 4 · Plan de tests

| Caso                                                                                                                                                                             | Nivel                | Cubre            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------- |
| 4 contraseñas incorrectas: contador en 4, sin bloqueo; el 5.º error bloquea 15 min, deja el contador en 0 y registra `LOGIN_FALLIDO` (5) + `BLOQUEO_CUENTA` con `bloqueadoHasta` | BD + Supertest       | §2.1, DoD        |
| Durante el bloqueo, la contraseña **correcta** da el mismo 401 y `CUENTA_BLOQUEADA`                                                                                              | BD + Supertest       | DoD              |
| Durante el bloqueo, una contraseña incorrecta no suma ni extiende `bloqueado_hasta`                                                                                              | BD + Supertest       | §2.1             |
| Con el bloqueo vencido (se mueve `bloqueado_hasta` al pasado), el login correcto entra y deja `bloqueado_hasta = null`                                                           | BD + Supertest       | §2.1             |
| Un login correcto después de 3 errores deja el contador en 0                                                                                                                     | BD + Supertest       | "seguidos"       |
| Con `MAX_INTENTOS_LOGIN = 3` y `MIN_BLOQUEO_LOGIN = 1` en la tabla, bloquea al 3.º error por 1 minuto                                                                            | BD + Supertest       | Parámetros vivos |
| Dos contraseñas incorrectas simultáneas suman 2                                                                                                                                  | BD                   | Atomicidad       |
| `leerParametroEntero` con un valor no numérico, cero o una clave borrada lanza un error                                                                                          | BD                   | §2.2             |
| La 11.ª petición en un minuto desde la misma IP recibe 429 `DEMASIADAS_PETICIONES` con cabecera `RateLimit`; otra IP (`X-Forwarded-For` con `trust proxy`) sigue pasando         | Supertest (BD falsa) | §2.3, DoD        |
| Las peticiones mal formadas también cuentan para el límite                                                                                                                       | Supertest (BD falsa) | §2.3             |
| `cargarConfig`: `LOGIN_LIMITE_POR_MINUTO` por defecto 10 y rechaza 0                                                                                                             | Unit                 | §2.3             |

**Deliberadamente sin test:**

- El reinicio del conteo al reiniciar la API: es el comportamiento conocido del almacenamiento en memoria (§6).
- El desbloqueo por Kardex: es S1.8.

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.4/SDD.md`, Estado = Aprobado.
- [ ] Test: el 5.º intento bloquea y el login correcto durante el bloqueo falla.
- [ ] Test del rate limit (429).
- [ ] `LOGIN_FALLIDO` y `BLOQUEO_CUENTA` en la misma transacción que el contador (DEC-007).
- [ ] Los valores salen de `parametro`; ninguno escrito en el código.
- [ ] DEC-013 en `LOG.md`.
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commit `S1.4 …` en la rama `feat/S1.4-bloqueo-intentos`.

---

## 6 · Riesgos

| Riesgo                                                                                             | Gravedad                        | Mitigación                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Alguien que conoce un CI bloquea esa cuenta a propósito, 15 min cada vez                           | Media                           | El bloqueo no se extiende (§2.1) y el rate limit frena a una misma IP. Kardex ve los `LOGIN_FALLIDO` en la bitácora y puede desbloquear (S1.8). |
| Varias personas detrás de la misma IP pública (la red de la escuela) comparten el límite de 10/min | Baja con el personal del piloto | El límite es configurable. Si en el piloto molesta, se sube con `LOGIN_LIMITE_POR_MINUTO` sin tocar código.                                     |
| El conteo del rate limit está en memoria: se reinicia con la API y no se comparte entre instancias | Baja (una sola instancia)       | Si la API se escala, hay que mover el conteo a PostgreSQL o Redis con un ADR.                                                                   |
| `TRUST_PROXY` mal configurado haría que todas las peticiones parezcan de la IP de Nginx            | Media                           | Compose ya fija `TRUST_PROXY=1` (S0.4), y `express-rate-limit` avisa en el log si detecta una configuración inconsistente.                      |

---

## 7 · Preguntas abiertas

Ninguna para la escuela. Las decisiones técnicas van a `LOG.md` como **DEC-013**:

1. El contador vuelve a 0 al bloquear y con un login correcto; durante el bloqueo, los errores no cuentan ni extienden el bloqueo; "seguidos" = sin un login correcto en medio, sin ventana de tiempo.
2. Rate limit con `express-rate-limit` 8.7.0, en memoria, solo en el login, contando todas las peticiones; 429 `DEMASIADAS_PETICIONES`; límite configurable con `LOGIN_LIMITE_POR_MINUTO`.
3. Módulo `catalogos` con `leerParametroEntero`; un parámetro inválido es un error, nunca un default silencioso.
