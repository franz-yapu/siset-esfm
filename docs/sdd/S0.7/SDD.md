# SDD — S0.7 · Base del API: módulos, errores, validación, seguridad, OpenAPI y auditoría

- **Ticket:** ClickUp **S0.7** (`868mgh289`, https://app.clickup.com/t/868mgh289).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §5 (API REST: prefijo `/api/v1`, error único, OpenAPI; RNF-01, RNF-07, RNF-10), §RF-14
  2. `docs/adr/0001-monolito-modular.md` (+ enmienda `personas`), `0002-autorizacion-casbin.md`, `0003-bitacora-inmutable.md`
  3. `docs/decisions/LOG.md` — DEC-002 (estructura de S0.7), DEC-004 (versiones), DEC-006 (ids `INTEGER`), **DEC-007** (trazabilidad desde S0.7)
  4. `docs/product/business-rules.md` §Bitácora, §Convenciones (error único); `docs/product/dudas.md` D-17
  5. `docs/planning/2026-10-12-tickets/S0.7-base-api.json` + comentarios del ticket en ClickUp (BigInt resuelto, `personas`, Casbin)

---

## 0 · Preguntas que el ticket pidió cerrar

| #   | Pregunta                                         | Respuesta                                                                                                     |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Cómo se serializan los ids `BigInt`?            | Ya no aplica: los ids son `INTEGER` (DEC-006, S0.11).                                                         |
| 2   | ¿Quién crea el cliente de BD y cuándo se cierra? | `servidor.ts` lo crea al arrancar y lo inyecta en `crearApp({ bd })`; lo cierra en `SIGTERM`/`SIGINT` (§2.2). |
| 3   | ¿A qué equivale el `ErrorNegocio` del prototipo? | `ErrorNegocio` (422) en `compartido/errores`, con `codigo` y `detalles` (§2.3).                               |

---

## 1 · Alcance

### Entra

- Composición de la app: `crearApp({ bd, config })`, prefijo `/api/v1` y montaje de los módulos.
- `compartido/`: configuración validada con Zod, jerarquía de errores con middleware de formato único, validación de `body`/`params`/`query` con Zod, contexto de la petición (`AsyncLocalStorage`), logger `pino` con redacción y documento OpenAPI 3.1 generado desde los esquemas Zod.
- Seguridad HTTP: Helmet, CORS restringido al origen de la web, límite de tamaño del JSON y `trust proxy` configurable para Nginx.
- Módulo **`salud`**: `GET /api/v1/health` (plantilla de módulo para los demás).
- Módulo **`auditoria`** (DEC-007): `registrarEvento()` público, que escribe en la misma transacción, toma usuario, IP y user agent del contexto y redacta datos sensibles.
- Swagger UI en `/api/v1/docs` y `openapi.json`, **solo fuera de producción**.

### No entra (a propósito)

- Autenticación, JWT, `autorizar` + Casbin, rate limit de login → S1.x (ADR-0002). Aquí `usuarioId` del contexto queda siempre en `null`; S1.x lo completa en el middleware de autenticación.
- `GET /auditoria`, la grilla conectada, el historial por entidad y el `REVOKE` → S6.4/S6.5, adelantadas a la Ola 2 (DEC-007).
- Endpoints de negocio (usuarios, files…) → sus tickets.
- Docker de la API y Nginx → S0.4. CI → S0.5.

### Premisas verificadas (`task-brief`)

| Premisa del ticket                                   | Qué hay de verdad en el repo                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estructura `src/{rutas,controladores,…}`             | ⚠️ Reemplazada por ADR-0001 / DEC-002: `src/compartido/` + `src/modulos/<modulo>/` (comentado en el ticket).                                                       |
| Existe `apps/api` con Express                        | ✅ Express 5.3, `crearApp()` mínimo, `servidor.ts` y tests de humo y fronteras (S0.3).                                                                             |
| `ErrorNegocio` en `apps/web/src/lib/transiciones.ts` | ✅ Es `class ErrorNegocio extends Error {}`, sin código ni datos. La API lo enriquece (§2.3).                                                                      |
| Cliente de BD                                        | ✅ `crearClienteBd()` y `TransaccionBd` en `compartido/bd` (S0.6/S0.11).                                                                                           |
| BigInt en respuestas                                 | ✅ Resuelto por S0.11 (ids `INTEGER`).                                                                                                                             |
| La bitácora existe                                   | ✅ Tabla de solo inserción (S0.11, ADR-0003). ❌ No hay nada que registre eventos: se agrega aquí (DEC-007).                                                       |
| Versiones                                            | ✅ Verificadas el 2026-10-13: zod 4.6, helmet 8.3, cors 2.8, pino 10.4, pino-http 11.0, zod-openapi 6.0 (peer zod ^4), swagger-ui-express 5.0 (peer express ≥4/5). |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo         | Rol              | API pública (`index.ts`)                                                                           | Tablas                           |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------- | -------------------------------- |
| `salud`        | **nuevo**, dueño | `crearModuloSalud({ bd })` → `{ router, openapi }`                                                 | — (solo `SELECT 1`)              |
| `auditoria`    | dueño            | `registrarEvento(bd \| tx, evento)`, tipos `EventoAuditoria`, `AccionAuditoria`, `ModuloAuditoria` | `log_auditoria` (solo inserción) |
| `compartido/*` | infraestructura  | config, errores, http (validar, contexto, openapi), logger, bd                                     | —                                |

**Contrato de todo módulo HTTP:** `index.ts` exporta `crearModulo<X>(deps)` y devuelve `{ router, openapi }`.
`app.ts` es la **raíz de composición**: el único lugar que conoce a todos los módulos y les inyecta
dependencias (`bd`, `config`). Así un módulo no crea su propio cliente de BD ni lee `process.env`.

### 2.1 Estructura resultante

```
apps/api/src/
  app.ts              crearApp({ bd, config, logger? }) → Express
  servidor.ts         lee config, crea bd y app, listen, cierre ordenado
  compartido/
    config.ts         esquema Zod del entorno → Config (falla al arrancar si falta algo)
    logger.ts         crearLogger(config) con redacción
    errores/
      errores.ts      ErrorApp, ErrorNegocio, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, ErrorNoAutenticado, ErrorProhibido
      manejador.ts    middleware de errores + 404 de rutas
      prisma.ts       traduce errores conocidos de Prisma
      index.ts
    http/
      contexto.ts     AsyncLocalStorage<ContextoPeticion> + middleware + obtenerContexto()
      validar.ts      validar({ body, params, query }) + tipos inferidos
      openapi.ts      crearDocumentoOpenApi(paths) + router de docs
      index.ts
    bd/               (existente)
  modulos/
    salud/            index, salud.rutas, salud.controlador, salud.servicio, salud.repositorio, salud.esquemas
    auditoria/        index, auditoria.servicio, auditoria.repositorio, auditoria.esquemas (tipos y redacción)
```

### 2.2 Configuración y ciclo de vida

`config.ts` valida con Zod y devuelve un objeto tipado:

| Variable       | Tipo / default                                                 | Uso                                                                                                      |
| -------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`     | `development` \| `test` \| `production`, default `development` | Docs y nivel de detalle de los errores                                                                   |
| `PORT`         | entero, default `3000`                                         | —                                                                                                        |
| `DATABASE_URL` | URL, obligatoria                                               | `crearClienteBd`                                                                                         |
| `CORS_ORIGEN`  | lista separada por comas, default `http://localhost:5173`      | CORS (RNF-10)                                                                                            |
| `TRUST_PROXY`  | entero ≥ 0, default `0`                                        | `app.set('trust proxy', n)`: con Nginx (S0.4) se pone en `1` para que `req.ip` sea la IP real (bitácora) |
| `LOG_LEVEL`    | `fatal`…`trace`, default `info` (`silent` en test)             | pino                                                                                                     |
| `JSON_LIMITE`  | default `100kb`                                                | `express.json({ limit })`                                                                                |

`servidor.ts`: `cargarConfig()` → `crearClienteBd(config.databaseUrl)` → `crearApp({ bd, config })` →
`listen`. En `SIGTERM`/`SIGINT`: `server.close()` y luego `bd.$disconnect()`. Si falta configuración,
termina con código 1 y un mensaje que nombra la variable (sin imprimir valores).

### 2.3 Errores y formato único

```ts
abstract class ErrorApp extends Error { abstract readonly estado: number; readonly codigo: string; readonly detalles?: unknown }
ErrorValidacion    → 400  VALIDACION        (detalles: issues de Zod: ruta + mensaje)
ErrorNoAutenticado → 401  NO_AUTENTICADO    (lo usa S1.x)
ErrorProhibido     → 403  PROHIBIDO         (lo usa S1.x / Casbin)
ErrorNoEncontrado  → 404  NO_ENCONTRADO
ErrorConflicto     → 409  CONFLICTO         (unicidad, concurrencia)
ErrorNegocio       → 422  REGLA_NEGOCIO     (código propio opcional, p. ej. FILE_BLOQUEADO)
```

**Por qué 422 para negocio y 409 para conflicto:** el ticket admite ambos. 409 queda para "choca con el
estado actual del recurso" (duplicado, alguien lo cambió antes) y 422 para "la petición es válida pero
una regla de negocio la impide" (file bloqueado, transición no permitida). Así el frontend distingue
"reintente" de "no se puede".

Middleware `manejarErrores` (último en la cadena):

- `ErrorApp` → `{ error: { code, message, details } }` con su estado.
- `SyntaxError` de `express.json` → 400 `JSON_INVALIDO`. Payload demasiado grande → 413 `PAYLOAD_DEMASIADO_GRANDE`.
- Prisma (`errores/prisma.ts`): `P2002` (único) → 409 `CONFLICTO`, con los campos en `details`; `P2003` (FK) → 409 `CONFLICTO`; `P2025` (no existe) → 404.
- Cualquier otro → 500 `ERROR_INTERNO`, mensaje genérico "Ocurrió un error inesperado." **Nunca** se envía el stack ni el mensaje interno; se registra completo en el log con el `idPeticion`.
- Las rutas inexistentes bajo `/api/v1` → 404 `NO_ENCONTRADO`.

`message` siempre está en español y es apto para mostrarse al usuario.

### 2.4 Validación (`compartido/http/validar.ts`)

```ts
validar({ body?: ZodType, params?: ZodType, query?: ZodType }): RequestHandler
// guarda los valores parseados en res.locals.valido (tipado con un helper `datosValidos<T>(res)`)
```

En Express 5, `req.query` es de solo lectura, así que los datos parseados (con coerción y defaults de Zod)
van a `res.locals.valido`, y el controlador los lee de ahí. Un fallo de cualquier parte lanza
`ErrorValidacion` con los `issues` mapeados a `{ ruta: 'body.ci', mensaje }`.

### 2.5 Contexto de la petición (`compartido/http/contexto.ts`)

```ts
interface ContextoPeticion { idPeticion: string; ip: string | null; userAgent: string | null; usuarioId: number | null }
middlewareContexto  // primero en la cadena: crea el contexto y corre el resto dentro de AsyncLocalStorage.run
obtenerContexto(): ContextoPeticion | undefined
```

- `idPeticion`: toma `X-Request-Id` si llega con un formato válido (≤ 64 caracteres `[A-Za-z0-9-]`); si no, genera `crypto.randomUUID()`. Se devuelve en la cabecera `X-Request-Id`.
- `ip`: `req.ip`, que respeta `TRUST_PROXY`.
- `usuarioId`: `null` aquí. S1.x lo asigna en el middleware de autenticación (el objeto del contexto es mutable dentro de la petición).

**Por qué `AsyncLocalStorage`:** la auditoría y el logger necesitan usuario, IP e id de petición en los
servicios y repositorios, sin pasarlos como parámetro por todas las capas. Es parte del runtime de Node
(sin dependencias) y funciona con `async/await`.

### 2.6 Logger (`compartido/logger.ts`)

`pino` + `pino-http`:

- El `genReqId` usa el `idPeticion` del contexto.
- Redacción (RNF-01: nunca contraseñas): `req.headers.authorization`, `req.headers.cookie`, `res.headers["set-cookie"]`, `*.password`, `*.passwordHash`, `*.token`, `*.refreshToken`.
- No registra los bodies.
- En desarrollo, el formato legible queda a elección del desarrollador (`pino-pretty` no se agrega como dependencia).

### 2.7 Seguridad HTTP (RNF-10)

Orden de la cadena:

```
contexto → pino-http → helmet() → cors({ origin: config.corsOrigen, credentials: true }) → express.json({ limit })
  → /api/v1/<módulos> → [docs si no es producción] → 404 → manejarErrores
```

- `credentials: true`: el refresh token irá en una cookie httpOnly (RNF-02, S1.x).
- CORS con una lista explícita, nunca `*`.
- `x-powered-by` desactivado (Helmet).
- HTTPS lo pone Nginx (S0.4).

### 2.8 OpenAPI (`compartido/http/openapi.ts`)

- Cada módulo declara sus esquemas Zod con `.meta({ id, description })` y exporta un fragmento `openapi`: los `paths` en el formato de `zod-openapi`.
- `crearDocumentoOpenApi(fragmentos)` arma el documento 3.1 con `createDocument` de **`zod-openapi` 6** (usa los metadatos nativos de Zod 4, sin parchear Zod).
- Se sirve en `GET /api/v1/openapi.json` y con Swagger UI en `GET /api/v1/docs`, **solo si `NODE_ENV !== 'production'`**.
- **Por qué `zod-openapi` y no `@asteasolutions/zod-to-openapi`:** los dos soportan Zod 4. `zod-openapi` usa `.meta()` nativo y no requiere `extendZodWithOpenApi`, lo que da menos acoplamiento.

### 2.9 Módulo `salud`

`GET /api/v1/health`:

- `200 { estado: 'ok', bd: 'ok', version }` si `SELECT 1` responde.
- `503 { error: { code: 'BD_NO_DISPONIBLE', … } }` si no.

Sigue las 5 capas (rutas → controlador → servicio → repositorio + esquemas), aunque sea mínimo: es la
**plantilla** que copian los módulos siguientes.

### 2.10 Módulo `auditoria` (DEC-007)

```ts
type AccionAuditoria = 'CREAR' | 'EDITAR' | 'DAR_DE_BAJA' | 'REACTIVAR' | 'CAMBIAR_ESTADO'
  | 'LOGIN' | 'LOGIN_FALLIDO' | 'LOGOUT' | 'CAMBIAR_PASSWORD' | 'RESTABLECER_PASSWORD' | 'BLOQUEO_CUENTA'
  | 'EXPORTAR' | 'IMPRIMIR';           // se amplía con un PR, nunca texto libre
type ModuloAuditoria = 'SEGURIDAD' | 'PERSONAS' | 'CATALOGOS' | 'FILES' | 'HOJAS_RUTA' | 'PASES'
  | 'DICTAMENES' | 'DOCUMENTOS' | 'REPORTES' | 'AUDITORIA';

interface EventoAuditoria {
  accion: AccionAuditoria; modulo: ModuloAuditoria;
  entidad?: string; entidadId?: string | number;
  antes?: unknown; despues?: unknown;
  usuarioId?: number | null;           // opcional: si no viene, se usa el del contexto (p. ej., LOGIN lo pasa explícito)
}

registrarEvento(cliente: ClienteBd | TransaccionBd, evento: EventoAuditoria): Promise<void>
```

- **Misma transacción (D-17):** el servicio dueño de la operación pasa su `tx`. Si la operación hace rollback, el evento también, y nunca queda un evento de algo que no ocurrió. Para eventos sin operación (LOGIN_FALLIDO), se pasa el cliente normal.
- **Contexto automático:** `ip`, `userAgent` y `usuarioId` salen de `obtenerContexto()`. Fuera de una petición (seed, scripts) quedan en `null`.
- **Redacción antes de guardar:** se reemplazan por `"[REDACTADO]"` las claves `password`, `passwordHash`, `token`, `tokenHash`, `refreshToken` (sin distinguir mayúsculas, a cualquier profundidad). Las fechas se serializan a ISO. Los valores no serializables lanzan un error en desarrollo y test.
- **"Eliminar" es dar de baja** (borrado lógico): la acción `DAR_DE_BAJA` guarda el antes (`activo: true`) y el después (`activo: false`). Así el administrador ve quién eliminó qué.
- **Lectura** (`GET /auditoria`, historial por usuario y por entidad) → S6.4/S6.5 (DEC-007). Este ticket deja los índices listos: ya existen `(usuario_id, fecha)`, `(modulo, fecha)` y `(fecha)`. Para el historial por entidad se agrega en S6.5 el índice `(entidad, entidad_id, fecha)`.

**Por qué explícito y no automático con una extensión de Prisma:**

- Una extensión que intercepte cada `create`/`update` guardaría operaciones técnicas (`UPDATE pase`), no acciones de negocio (`RECIBIR_PASE`).
- Necesitaría una lectura extra para el "antes" en cada `update`.
- No sabe cuándo una escritura es parte de una acción mayor.

El registro explícito en el servicio da eventos legibles para Kardex. El riesgo de olvidarlo se cubre con
la regla de DEC-007 en la DoD y con un test por cada endpoint de escritura que verifique su evento.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                   | Cambio                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/package.json`                          | Dependencias: `zod`, `helmet`, `cors`, `pino`, `pino-http`, `zod-openapi`, `swagger-ui-express`. Dev: `@types/cors`, `@types/swagger-ui-express`. Versiones de §1. |
| `apps/api/src/app.ts`                            | Reescrito: `crearApp({ bd, config, logger? })`, cadena de §2.7.                                                                                                    |
| `apps/api/src/servidor.ts`                       | Reescrito (§2.2). Sale el `console.info` con disable: usa el logger.                                                                                               |
| `apps/api/src/compartido/config.ts`, `logger.ts` | **Nuevos.**                                                                                                                                                        |
| `apps/api/src/compartido/errores/*`              | **Nuevos** (§2.3).                                                                                                                                                 |
| `apps/api/src/compartido/http/*`                 | **Nuevos** (§2.4, §2.5, §2.8).                                                                                                                                     |
| `apps/api/src/modulos/salud/*`                   | **Nuevos** (§2.9).                                                                                                                                                 |
| `apps/api/src/modulos/auditoria/*`               | **Nuevos** (§2.10).                                                                                                                                                |
| `apps/api/src/modulos/.gitkeep`                  | Se elimina.                                                                                                                                                        |
| `apps/api/.env.example`                          | `NODE_ENV`, `CORS_ORIGEN`, `TRUST_PROXY`, `LOG_LEVEL`, `JSON_LIMITE`.                                                                                              |
| `apps/api/test/app.test.ts`                      | Se reemplaza por `test/http/*.test.ts` (§4).                                                                                                                       |
| `apps/api/test/fronteras.test.ts`                | Sin cambios (sigue validando ADR-0001 con la estructura real).                                                                                                     |
| `README.md`                                      | Sección API: `/api/v1/health`, `/api/v1/docs`.                                                                                                                     |
| `docs/decisions/LOG.md`, `CLAUDE.md`             | DEC-007 y la regla de trazabilidad (ya escritos con este SDD).                                                                                                     |

Commits en `feat/S0.7-base-api`:

1. `S0.7 SDD y DEC-007 trazabilidad`
2. `S0.7 compartido: config, errores, validación, contexto y logger`
3. `S0.7 app con seguridad HTTP, OpenAPI y módulo salud`
4. `S0.7 módulo auditoria con registrarEvento`
5. `S0.7 tests de la base del API`

---

## 4 · Plan de tests

**HTTP (supertest, `npm test`, sin BD; `bd` falsa que implementa `$queryRaw`):**

| Caso                                                                                                              | Cubre                       |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `GET /api/v1/health` → 200 `{estado:'ok', bd:'ok'}`                                                               | DoD                         |
| Con la BD caída (`$queryRaw` rechaza) → 503 `BD_NO_DISPONIBLE`                                                    | Salud real, no un `ok` fijo |
| Ruta inexistente → 404 con formato único                                                                          | §2.3                        |
| Router de prueba con `validar`: body inválido → 400 `VALIDACION` con `details[].ruta`                             | DoD                         |
| Router de prueba que lanza `ErrorNegocio` → 422; `ErrorConflicto` → 409; error de Prisma `P2002` → 409            | §2.3                        |
| Error inesperado → 500 con mensaje genérico; la respuesta **no** contiene el mensaje interno ni el stack          | RNF-01 / seguridad          |
| JSON malformado → 400 `JSON_INVALIDO`; body de más de `JSON_LIMITE` → 413                                         | §2.3                        |
| Cabeceras de Helmet presentes (`x-content-type-options`, `content-security-policy`…) y sin `x-powered-by`         | DoD                         |
| CORS: el origen permitido recibe `access-control-allow-origin`; otro origen no                                    | RNF-10                      |
| `X-Request-Id`: se genera si no llega, se respeta si es válido y se reemplaza si es inválido                      | §2.5                        |
| `GET /api/v1/openapi.json` incluye `/api/v1/health`; con `NODE_ENV=production`, `/docs` y `/openapi.json` dan 404 | DoD                         |
| Logger: un objeto con `password` sale como `[Redacted]` (destino en memoria)                                      | RNF-01                      |

**Unitarios:**

| Caso                                                                                                             | Cubre |
| ---------------------------------------------------------------------------------------------------------------- | ----- |
| `cargarConfig`: falta `DATABASE_URL` → error que nombra la variable sin mostrar valores; los defaults se aplican | §2.2  |
| `redactar()`: claves sensibles anidadas y en arreglos → `[REDACTADO]`; fechas → ISO                              | §2.10 |

**BD (`test:bd`):**

| Caso                                                                                                     | Cubre  |
| -------------------------------------------------------------------------------------------------------- | ------ |
| `registrarEvento` dentro de un contexto simulado → fila con `ip`, `user_agent`, `usuario_id` y acción    | §2.10  |
| `registrarEvento` dentro de una `$transaction` que luego falla → **no** queda evento (misma transacción) | D-17   |
| `antes`/`despues` con `passwordHash` → guardados como `[REDACTADO]`                                      | RNF-01 |
| Fuera de contexto → `usuario_id`, `ip` y `user_agent` `NULL`                                             | §2.10  |

**Sin cambios:** los tests de fronteras de ADR-0001 deben seguir pasando con los módulos reales (sin
imports profundos entre `salud` y `auditoria`).

**Deliberadamente sin test:** Swagger UI renderizado (es HTML de un tercero; basta con `openapi.json`);
el cierre por `SIGTERM` (se prueba a mano y lo anota el PR).

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] `GET /api/v1/health` responde 200 con la BD arriba y 503 con la BD caída
- [ ] Un body inválido devuelve 400 con el formato único
- [ ] Swagger UI disponible en desarrollo y oculto en producción
- [ ] Cabeceras de Helmet presentes; CORS solo para `CORS_ORIGEN`
- [ ] `registrarEvento` escribe en la misma transacción, con contexto y redacción (tests de BD)
- [ ] Ningún error 500 filtra mensajes internos ni stack
- [ ] Gate de la raíz y `test:bd` en verde
- [ ] PR a `main`; S0.7 en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                         | Gravedad            | Mitigación                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------- |
| Alcance mayor que el ticket (5 h + auditoría)                                  | Media               | La auditoría se limita a escribir; la lectura y la pantalla van a S6.4/S6.5. Estimación revisada: unas 7 h. |
| Olvidar `registrarEvento` en un endpoint futuro                                | Alta (para DEC-007) | Regla en CLAUDE.md y en la DoD; test por cada endpoint de escritura; checklist del PR.                      |
| `AsyncLocalStorage` pierde el contexto con alguna librería basada en callbacks | Baja                | Express 5 + Prisma + pino son compatibles; hay un test que verifica el contexto dentro de un repositorio.   |
| `zod-openapi` 6 cambia la API en una versión menor                             | Baja                | Versión fijada; el uso queda concentrado en `compartido/http/openapi.ts`.                                   |
| Sin `TRUST_PROXY` detrás de Nginx, la bitácora guarda la IP del proxy          | Media               | Variable documentada; S0.4 la fija en `1`. Lo cubre el test de `req.ip` con proxy.                          |

---

## 7 · Preguntas abiertas

1. **¿"Administrador" es Kardex?** El PRD §2 no tiene un rol ADMIN: Kardex gestiona usuarios y ve la
   bitácora (`GET /auditoria` → KARDEX). DEC-007 lo asume así. Si se quiere un rol ADMIN aparte (por
   ejemplo, sistemas o dirección), es un rol nuevo y cambia la matriz de Casbin (ADR-0002). Se pregunta
   al responsable; no bloquea S0.7.
