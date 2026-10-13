# SDD — S1.2 + S1.7 · Contraseñas con bcrypt y eventos de acceso en la bitácora

- **Tickets:** ClickUp **S1.2** (`868mh1kuv`, https://app.clickup.com/t/868mh1kuv) y **S1.7** (`868mh1kv0`, https://app.clickup.com/t/868mh1kv0). Comparten un SDD porque los dos preparan, sin endpoints todavía, lo que usa el login (S1.3).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/business-rules.md` §Seguridad: bcrypt costo ≥ 12; 5 intentos → bloqueo 15 min. **La política de contraseña cambia en este SDD:** el responsable del proyecto pidió letras, números **y símbolos** (DEC-011)
  2. `docs/product/PRD.md` RF-01 (CA1–CA4), RF-03 CA4 (reseteo por Kardex), RF-14, RNF-01, RNF-10 (validación con Zod)
  3. `docs/decisions/LOG.md` — DEC-007 (todo evento de acceso va a la bitácora), DEC-010 #2 (la auditoría vive en el caso de uso)
  4. `docs/sdd/S0.7/SDD.md` §2.10 (`registrarEvento`, acciones tipadas, redacción)
  5. `docs/product/dudas.md` D-26 (intentos con un CI inexistente: provisional, no se anotan)
  6. `docs/do-not-touch.md` (auth y bitácora: no se reestructuran sin ADR)
  7. `docs/sdd/S1.1/SDD.md` (módulo `seguridad`)

---

## 1 · Alcance

### Entra

**S1.2 — contraseñas**

- `hashPassword` y `compararPassword` (bcrypt, costo 12) en el módulo `seguridad`.
- `esquemaPassword` (Zod): la política de contraseña nueva (mínimo 8 caracteres, con letras, números y símbolos), con los mismos mensajes que la web.
- Actualizar la regla en `business-rules.md`, en el seed, en la CI y en `.env.example`.
- El seed usa ese hash y ese esquema; deja de tener su propia regex y su propio costo.
- La web (`validarClave`) se alinea con la API (§2.2).

**S1.7 — eventos de acceso**

- Funciones del módulo `seguridad` que registran cada evento de acceso con datos fijos y seguros: login, login fallido, bloqueo, logout, cambio y restablecimiento de contraseña (§2.4).

### No entra (a propósito)

- Endpoints, JWT, cookie y contador de intentos → S1.3, S1.4 y S1.5. Este ticket no llama a las funciones de eventos desde ningún caso de uso: no hay casos de uso todavía.
- Comparar contra un hash ficticio cuando el CI no existe, para no revelar qué CI existen por el tiempo de respuesta → S1.3, que es quien busca al usuario.
- Usuarios de demostración en el seed (los alias "kardex", "secdir"…) → no los necesita ningún ticket del piloto. El seed sigue creando solo el Kardex inicial.
- Cambiar la regex de redacción de la bitácora (`redactar`) → no se toca (§6 y §7.2).

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                                               | Qué hay de verdad en el repo                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1.2:** "Esquema zod compartido" entre web y API                               | ⚠️ No hay paquete compartido (`workspaces: apps/*`) y la web no usa Zod. La API no importa del frontend (`catalogos-seed.test.ts`). Se resuelve con un esquema Zod en la API y **los mismos casos de prueba en los dos lados** (§2.2).                                                                   |
| **S1.2:** política "mín. 8, letras y números"                                    | ❌ **Cambia por pedido del responsable (2026-10-13):** mínimo 8 caracteres con letras, números y símbolos. Se actualiza `business-rules.md` y se registra en DEC-011. Las contraseñas de prueba sin símbolo (`.env.example`, la CI, los tests) se cambian.                                               |
| **S1.2:** reutilizar `validarClave` de `apps/web/src/lib/reglas.ts`              | ❌ **Web y API ya dicen cosas distintas.** La web acepta solo letras sin tilde (`[a-zA-Z]`); el seed acepta cualquier letra (`\p{L}`). Con la web, `cañón123` no tiene "letras" y se rechaza. Se unifica con `\p{L}` en los dos lados.                                                                   |
| **S1.2:** bcrypt costo 12                                                        | ✅ Ya lo usa el seed (`bcryptjs` 3, `COSTO_BCRYPT = 12`). Se mueve al módulo `seguridad`.                                                                                                                                                                                                                |
| **S1.2:** falta un límite de largo                                               | ❌ **bcrypt solo usa los primeros 72 bytes.** Probado en el repo: con 72 `a` + `X` como contraseña, la comparación con 72 `a` + `Y` **da verdadero**. Se agrega un máximo de 72 bytes (§2.2).                                                                                                            |
| **S1.2:** seed de desarrollo con contraseñas hasheadas                           | ✅ Ya existe desde S0.11 (Kardex inicial con bcrypt costo 12). Solo cambia de dónde toma el hash y la regla.                                                                                                                                                                                             |
| **S1.7:** crear las acciones LOGIN, LOGIN_FALLIDO, LOGOUT, CAMBIO_CLAVE, BLOQUEO | ⚠️ **Ya existen desde S0.7, con otros nombres:** `LOGIN`, `LOGIN_FALLIDO`, `LOGOUT`, `CAMBIAR_PASSWORD`, `RESTABLECER_PASSWORD`, `BLOQUEO_CUENTA`. Se usan las existentes; no se renombran (la bitácora está en `do-not-touch`). Falta definir **qué guarda cada evento**: eso es lo que construye S1.7. |
| **S1.7:** login fallido con un usuario inexistente no se registra (D-26)         | ✅ `log_auditoria.usuario_id` ya es nullable (ADR-0003). Se aplica la propuesta provisional: las funciones exigen un `usuarioId`, así que no hay forma de registrar un CI inexistente sin cambiar el código.                                                                                             |
| **S1.7:** nunca guardar la contraseña ni el token                                | ⚠️ `redactar` tapa las claves que contienen `password`, `token` o `secret`, pero **no** las palabras en español (`clave`, `contrasena`). Como no se puede ampliar sin ADR, la protección está en la firma: las funciones de eventos no reciben datos libres (§2.4).                                      |
| **Ambos:** "toda escritura y evento de acceso registra su evento" (DoD)          | ✅ S1.2 no escribe nada. S1.7 es justamente la forma de registrar los eventos de acceso; lo llaman S1.3, S1.4, S1.5 y S1.8.                                                                                                                                                                              |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket | API pública (`index.ts`)                                                    | Tablas propias que toca                          |
| ----------- | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------ |
| `seguridad` | dueño              | **agrega** `hashPassword`, `esquemaPassword` (los usa el seed y luego S1.8) | ninguna                                          |
| `auditoria` | consumido          | `registrarEvento` (sin cambios)                                             | `log_auditoria` (inserta, vía `registrarEvento`) |

### 2.1 Hash y comparación (`seguridad/password.ts`)

```ts
/** RNF-01: bcrypt con costo ≥ 12. */
export const COSTO_BCRYPT = 12;

export const hashPassword = (plano: string): Promise<string> => bcrypt.hash(plano, COSTO_BCRYPT);

export const compararPassword = (plano: string, hash: string): Promise<boolean> => bcrypt.compare(plano, hash);
```

- Se mantiene **`bcryptjs`**: ya está en el proyecto, es software libre (RNF-09) y no necesita compilar código nativo en Docker. Con costo 12 tarda unos 200–300 ms por hash, aceptable para un login.
- `hashPassword` no valida la política. Validar es tarea del esquema, en el borde (endpoint o seed), para que nadie llame al hash con datos sin validar sin darse cuenta.

### 2.2 Política de contraseña (`seguridad/password.esquemas.ts`)

```ts
export const MENSAJES_PASSWORD = {
  corta: 'Debe tener al menos 8 caracteres',
  sinCombinar: 'Debe combinar letras, números y símbolos',
  larga: 'Es demasiado larga (máximo 72 bytes)',
} as const;

export const esquemaPassword = z
  .string()
  .min(8, MENSAJES_PASSWORD.corta)
  .refine((v) => /\p{L}/u.test(v) && /\p{N}/u.test(v) && /[^\p{L}\p{N}\s]/u.test(v), MENSAJES_PASSWORD.sinCombinar)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, MENSAJES_PASSWORD.larga);
```

**Por qué así:**

- **Letras, números y símbolos (DEC-011).** Símbolo = cualquier carácter que no sea letra, número ni espacio (`! @ # . - _ * $`…). El espacio se permite, pero no cuenta como símbolo.
- **Letras = cualquier letra Unicode (`\p{L}`).** Los usuarios escriben en español: `ñ`, `á` y `ü` son letras. Ya era la regla del seed. La web pasa de `[a-zA-Z]` a `\p{L}`.
- **Máximo 72 bytes.** Es el límite real de bcrypt (§1, premisa probada). Sin este límite, dos contraseñas largas que comparten los primeros 72 bytes valen lo mismo. Se cuenta en bytes y no en caracteres porque una letra con tilde ocupa 2 bytes. En la práctica nadie llega: 72 bytes son más de 36 caracteres incluso con tildes en todas las letras.
- **Los mensajes son los mismos que muestra hoy la web**, más el nuevo de largo. La web recibe la misma regla:

```ts
// apps/web/src/lib/reglas.ts
export const validarClave = (clave: string): string | null => {
  if (clave.length < 8) return 'Debe tener al menos 8 caracteres';
  if (!/\p{L}/u.test(clave) || !/\p{N}/u.test(clave) || !/[^\p{L}\p{N}\s]/u.test(clave))
    return 'Debe combinar letras, números y símbolos';
  if (new TextEncoder().encode(clave).length > 72) return 'Es demasiado larga (máximo 72 bytes)';
  return null;
};
```

- La pantalla de cambio de contraseña (P-03, `CambiarClave.tsx`) muestra la lista "Mínimo 8 caracteres · Letras, números y símbolos" y `fuerzaClave` usa la misma definición de letra y símbolo.
- **Cómo se evita que web y API vuelvan a separarse:** hay una tabla de casos (`'abc123.!'` válida, `'cañón12#'` válida, `'abc12345'` sin símbolo, `'abc 1234'` sin símbolo (el espacio no cuenta), 73 bytes demasiado larga, etc.) **duplicada a propósito** en un test de cada lado, con un comentario que apunta al otro. Si alguien cambia una regla, su test falla hasta que actualice los dos.

### 2.3 Seed

`prisma/semilla.ts` deja de definir `COSTO_BCRYPT` y `REGLA_CONTRASENA`. Importa `hashPassword` y `esquemaPassword` desde `@/modulos/seguridad` (su `index.ts`). El mensaje de error del seed sigue sin mostrar la contraseña: usa los mensajes del esquema, que no la incluyen.

### 2.4 Eventos de acceso (`seguridad/eventos-acceso.ts`)

Una función por evento. Todas usan módulo `SEGURIDAD`, entidad `usuario` y `entidadId` igual al usuario afectado, y pasan `usuarioId` explícito: en el login todavía no hay usuario en el contexto de la petición (S0.7 §2.10). **Solo reciben datos tipados y acotados**; no hay ningún parámetro `datos: unknown` por donde pueda colarse una contraseña o un token.

| Función                                                         | Acción                 | `usuario_id` (quién)        | `datos_despues`                | La llama    |
| --------------------------------------------------------------- | ---------------------- | --------------------------- | ------------------------------ | ----------- |
| `registrarLogin(c, usuarioId)`                                  | `LOGIN`                | el que entra                | —                              | S1.3        |
| `registrarLoginFallido(c, usuarioId, motivo, intentosFallidos)` | `LOGIN_FALLIDO`        | el dueño de la cuenta       | `{ motivo, intentosFallidos }` | S1.3 / S1.4 |
| `registrarBloqueo(c, usuarioId, bloqueadoHasta)`                | `BLOQUEO_CUENTA`       | el dueño de la cuenta       | `{ bloqueadoHasta }`           | S1.4        |
| `registrarLogout(c, usuarioId)`                                 | `LOGOUT`               | el que sale                 | —                              | S1.5        |
| `registrarCambioPassword(c, usuarioId)`                         | `CAMBIAR_PASSWORD`     | el que cambia la suya       | —                              | S1.9 / S1.3 |
| `registrarRestablecimientoPassword(c, usuarioAfectadoId)`       | `RESTABLECER_PASSWORD` | Kardex, tomado del contexto | — (`entidad_id` = afectado)    | S1.8        |

```ts
type Cliente = ClienteBd | TransaccionBd;
export type MotivoLoginFallido = 'PASSWORD_INCORRECTA' | 'CUENTA_BLOQUEADA' | 'CUENTA_INACTIVA';
```

- **D-26 (provisional):** ninguna función acepta un usuario nulo. El login con un CI inexistente no se anota. Si la escuela responde lo contrario, se agrega una función `registrarLoginCiInexistente` sin tocar las demás, y el CI se guardaría en `entidad_id`, nunca la contraseña.
- **Transacción:** como en todo `registrarEvento`, quien llama pasa su `tx`. Así, el `LOGIN` y la creación del refresh token (S1.1) caen o quedan juntos. `LOGIN_FALLIDO` va en la misma transacción que el aumento de `intentos_fallidos` (S1.4).
- **Por qué en `seguridad` y no en `auditoria`:** `auditoria` guarda eventos de cualquier módulo y no sabe qué es un login. Qué datos lleva un evento de acceso es una regla de seguridad, y vive con su dueño (ADR-0001). `auditoria` no cambia.
- Estas funciones son internas del módulo (no van en `index.ts`): solo los casos de uso de `seguridad` las llaman.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                                                       | Cambio                                                                                                          |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modulos/seguridad/password.ts`                                                         | **Nuevo** (§2.1).                                                                                               |
| `apps/api/src/modulos/seguridad/password.esquemas.ts`                                                | **Nuevo** (§2.2).                                                                                               |
| `apps/api/src/modulos/seguridad/eventos-acceso.ts`                                                   | **Nuevo** (§2.4).                                                                                               |
| `apps/api/src/modulos/seguridad/index.ts`                                                            | Exporta `hashPassword`, `compararPassword`, `esquemaPassword`, `MENSAJES_PASSWORD` y `COSTO_BCRYPT`.            |
| `apps/api/prisma/semilla.ts`                                                                         | Usa `hashPassword` y `esquemaPassword`; se borran `COSTO_BCRYPT` y `REGLA_CONTRASENA` (§2.3).                   |
| `apps/api/test/semilla.test.ts`, `test/bd/semilla.test.ts`                                           | Ajustar la importación de `COSTO_BCRYPT` si la usan.                                                            |
| `apps/api/test/seguridad-password.test.ts`                                                           | **Nuevo**: hash, comparación, costo y tabla de casos de la política.                                            |
| `apps/api/test/bd/eventos-acceso.test.ts`                                                            | **Nuevo** (§4).                                                                                                 |
| `apps/web/src/lib/reglas.ts`                                                                         | `validarClave` con letras, números y símbolos, y máximo 72 bytes; `fuerzaClave` con la misma definición (§2.2). |
| `apps/web/src/pages/publicas/CambiarClave.tsx`                                                       | La lista de reglas dice "Letras, números y símbolos" y usa `validarClave` para marcarla.                        |
| `docs/product/business-rules.md`, `modelo-datos.md`, `prototipo-pantallas.md`                        | La regla nueva de contraseña (DEC-011).                                                                         |
| `apps/api/.env.example`, `.github/workflows/ci.yml`, `test/bd/utilidades.ts`, `test/semilla.test.ts` | Contraseñas de prueba con símbolo.                                                                              |
| `apps/web/src/lib/reglas.test.ts` (o el test existente de reglas)                                    | La misma tabla de casos.                                                                                        |
| `docs/decisions/LOG.md`                                                                              | DEC-011 (§7.1).                                                                                                 |

---

## 4 · Plan de tests

| Caso                                                                                                                                                                                                                                        | Nivel                         | Cubre                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------- |
| `hashPassword` produce un hash `$2b$12$…` distinto en cada llamada (salt)                                                                                                                                                                   | Unit (API)                    | Costo 12, RNF-01                            |
| `compararPassword` da `true` con la contraseña correcta y `false` con otra                                                                                                                                                                  | Unit (API)                    | §2.1                                        |
| Tabla de casos de la política: válidas (`abc123.!`, `cañón12#`, `Ñandú-2026`, 72 bytes exactos) e inválidas, con su mensaje (`ab1.` corta; `abc12345`, `abc.-_!?`, `1234.-_!` y `abc 1234` sin combinar; `ñ` × 35 + `1.a` = 73 bytes larga) | Unit (API, `esquemaPassword`) | §2.2                                        |
| La misma tabla con `validarClave`                                                                                                                                                                                                           | Unit (web, Vitest)            | Web y API dicen lo mismo                    |
| El seed rechaza una contraseña que no cumple, sin mostrarla en el mensaje (test existente, ahora con el esquema)                                                                                                                            | Unit (API)                    | §2.3                                        |
| El Kardex del seed queda con bcrypt costo 12 (test existente)                                                                                                                                                                               | BD                            | §2.3                                        |
| Cada función de `eventos-acceso` guarda la acción, el módulo `SEGURIDAD`, la entidad `usuario`, `entidad_id`, el `usuario_id` correcto y exactamente los `datos_despues` de la tabla de §2.4                                                | BD                            | §2.4                                        |
| `registrarRestablecimientoPassword` toma al Kardex del contexto y guarda al afectado en `entidad_id`                                                                                                                                        | BD                            | §2.4                                        |
| Ningún evento de acceso tiene `datos_antes`, y ningún `datos_despues` tiene claves fuera de las de §2.4                                                                                                                                     | BD                            | Nada sensible en la bitácora                |
| Un evento dentro de una transacción que falla no queda guardado                                                                                                                                                                             | BD                            | D-17 (se repite aquí para `registrarLogin`) |

**Deliberadamente sin test:**

- El tiempo de bcrypt: depende de la máquina, y el costo ya lo prueba el prefijo `$2b$12$`.
- El login con un CI inexistente: no hay función que lo registre, y el compilador impide pasar `null`. La prueba de punta a punta es de S1.3.

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.2-S1.7/SDD.md`, Estado = Aprobado (cubre los dos tickets).
- [ ] Contraseñas solo con bcrypt costo 12; nunca en logs ni en la bitácora (las funciones de eventos no las reciben).
- [ ] Web y API con la misma política (letras, números y símbolos), incluido el máximo de 72 bytes, y la misma tabla de casos en verde.
- [ ] Acciones de acceso con sus datos definidos y probados (§2.4).
- [ ] DEC-011 en `LOG.md`.
- [ ] Tests de §4 en verde (`npm run test` y `npm run test:bd`).
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commits `S1.2 …` y `S1.7 …` en la rama `feat/S1.2-S1.7-bcrypt-eventos-acceso`.

---

## 6 · Riesgos

| Riesgo                                                                                                               | Gravedad | Mitigación                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Un ticket futuro audita un objeto con la contraseña bajo una clave en español (`claveNueva`) y `redactar` no la tapa | Media    | Los eventos de acceso no aceptan datos libres (§2.4). El caso general queda anotado en §7.2 para un ADR de la bitácora. |
| Endurecer la política en la web rompe un E2E o una demo con una contraseña de más de 72 bytes                        | Muy baja | Las contraseñas de la demo son cortas; el E2E corre en la CI.                                                           |
| bcrypt costo 12 en JavaScript puro hace lento el test unitario                                                       | Baja     | Hay pocos hashes en los tests; el costo se verifica por el prefijo y no se baja para los tests.                         |

---

## 7 · Preguntas abiertas

1. **DEC-011 (va a `LOG.md`):** (0) la contraseña exige letras, números y símbolos, por pedido del responsable; (a) se usan los nombres de acciones de S0.7 (`CAMBIAR_PASSWORD`, `BLOQUEO_CUENTA`, `RESTABLECER_PASSWORD`) y no los del ticket; (b) la política acepta cualquier letra Unicode y suma un máximo de 72 bytes (decisión técnica), en web y API; (c) los eventos de acceso se registran solo con las funciones de `seguridad/eventos-acceso.ts`, que no aceptan datos libres.
2. **Redacción de claves en español (para un ADR de la bitácora, sin fecha):** `redactar` no tapa `clave` ni `contrasena`. No se puede agregar `clave` tal cual porque taparía `parametro.clave` (por ejemplo, `MAX_INTENTOS_LOGIN`) en los eventos de edición de parámetros. Mientras tanto, la convención es que todo campo de contraseña en el código se llame `password…`. No bloquea el piloto.
