# SDD — S1.1 · Tabla `refresh_token` y tabla `parametro`

- **Ticket:** ClickUp **S1.1** (`868mh1kur`, https://app.clickup.com/t/868mh1kur).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/modelo-datos.md` §Convenciones (FK y excepción `CASCADE`), §seguridad (`refresh_token`), §catalogos (`parametro`)
  2. `docs/product/business-rules.md` §Seguridad (5 intentos → bloqueo 15 min; refresh rotado en cookie httpOnly)
  3. `docs/decisions/LOG.md` — DEC-006 (ids `INTEGER`, excepciones `CASCADE`), DEC-007 (trazabilidad), DEC-009 (piloto)
  4. `docs/adr/0001-monolito-modular.md` (módulo dueño de cada tabla)
  5. `docs/sdd/S0.11/SDD.md` §1 "No entra" (asigna `refresh_token` **y `parametro`** a S1.1), §2.5 (cómo se crea una migración con SQL a mano)
  6. `docs/sdd/S0.6/SDD.md` v1.1 §2.7 (tests de BD con base temporal; nunca `migrate reset`)
  7. `docs/bd-tentaiva/siset_schema.sql` (tipos y tamaños de referencia de ambas tablas)

---

## 1 · Alcance

### Entra

- Modelo `RefreshToken` (`refresh_token`) en `seguridad.prisma`.
- Modelo `Parametro` (`parametro`) en `catalogos.prisma`, con las **dos claves de login** sembradas:
  `MAX_INTENTOS_LOGIN = 5` y `MIN_BLOQUEO_LOGIN = 15`.
- Una migración nueva (`refresh_token_parametro`), sin tocar la inicial.
- Primer código del módulo `seguridad` en `src/modulos/seguridad/`: el repositorio de refresh tokens y la función que calcula el hash.
- Ajuste de los tests de esquema de S0.11, que hoy fijan "6 tablas" y "todas las FK son RESTRICT".

### No entra (a propósito)

- Generar, firmar o validar tokens, la cookie y los endpoints → S1.3 (login) y S1.5 (refresh y logout).
- La duración del refresh token → S1.3/S1.5 (§7.2). Esta tabla solo guarda `expira_en`.
- Leer `parametro` desde el servicio de login y aplicar el bloqueo → S1.4.
- `MAX_UF_REPROBADAS` y `DIAS_ALERTA_TRAMITE` → S2.1 y S3.x. `MAX_UF_REPROBADAS` depende de D-07 (abierta); no se siembra un valor que la escuela no confirmó.
- Pantalla o API para editar parámetros. Cuando exista, cada cambio registrará su evento de auditoría (DEC-007).
- Limpieza de tokens vencidos → §6.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                                                                             | Qué hay de verdad en el repo                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los campos de bloqueo (`intentos_fallidos`, `bloqueado_hasta`, `debe_cambiar_password`) ya existen desde S0.11 | ✅ En `seguridad.prisma` y en la migración `20261013155722_inicial`, con `CHECK intentos_fallidos >= 0`.                                                                                                                                                   |
| El ticket solo agrega `refresh_token`                                                                          | ⚠️ **Le falta `parametro`.** `modelo-datos.md` §catalogos y el SDD de S0.11 §1 asignan `parametro` a S1.1, y ningún otro ticket del piloto lo crea. S1.4 (bloqueo) necesita `MAX_INTENTOS_LOGIN` y `MIN_BLOQUEO_LOGIN`. **Se incluye aquí** (+0,5 h).      |
| El repositorio va "en el módulo `seguridad`"                                                                   | ⚠️ El módulo no existe todavía: `src/modulos/` solo tiene `auditoria` y `salud`. Este ticket crea la carpeta.                                                                                                                                              |
| Migración con Prisma 7 y base temporal en tests                                                                | ✅ Prisma 7.10.0; `test/bd/preparar-bd.ts` crea una base nueva y aplica `migrate deploy`.                                                                                                                                                                  |
| `token_hash` SHA-256 y FK `CASCADE` como excepción documentada                                                 | ✅ `modelo-datos.md` §Convenciones y DEC-006.                                                                                                                                                                                                              |
| "Toda escritura y evento de acceso registra su evento de auditoría" (DoD)                                      | ⚠️ No aplica en este ticket: no hay caso de uso ni endpoint. Las filas de `refresh_token` son estado técnico de la sesión, no datos de negocio. El evento se registra en el caso de uso que las escribe: `LOGIN` en S1.3/S1.7, `LOGOUT` en S1.5. Ver §2.4. |
| Los tests de esquema siguen pasando sin cambios                                                                | ❌ `esquema.test.ts` exige exactamente 6 tablas y 4 FK, todas RESTRICT. Se actualizan (§3).                                                                                                                                                                |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket       | API pública (`index.ts`)                                                       | Tablas propias que toca |
| ----------- | ------------------------ | ------------------------------------------------------------------------------ | ----------------------- |
| `seguridad` | dueño, **carpeta nueva** | ninguna todavía: el repositorio es interno y lo usa S1.3 desde el mismo módulo | `refresh_token` (nueva) |
| `catalogos` | dueño                    | — (sin código en `src/`; S1.4 agregará la lectura)                             | `parametro` (nueva)     |

### 2.1 Esquema

```prisma
// seguridad.prisma — se agrega
model RefreshToken {
  id         Int       @id @default(autoincrement())
  usuarioId  Int       @map("usuario_id")
  /// SHA-256 en hexadecimal del token; el token en claro nunca se guarda (RNF-01).
  tokenHash  String    @unique @map("token_hash") @db.Char(64)
  expiraEn   DateTime  @map("expira_en") @db.Timestamptz(6)
  revocadoEn DateTime? @map("revocado_en") @db.Timestamptz(6)
  ip         String?   @db.Inet
  userAgent  String?   @map("user_agent") @db.VarChar(255)
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  /// CASCADE: excepción documentada en modelo-datos.md §Convenciones (DEC-006).
  usuario    Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade, onUpdate: Restrict)

  @@index([usuarioId])
  @@map("refresh_token")
}
// en model Usuario se agrega la back-relation:
//   refreshTokens RefreshToken[]
```

```prisma
// catalogos.prisma — se agrega
/// Reglas configurables sin tocar código (modelo-datos.md §catalogos).
model Parametro {
  clave       String   @id @db.VarChar(50)
  valor       String   @db.VarChar(100)
  descripcion String?  @db.VarChar(255)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("parametro")
}
```

**Por qué así:**

- **`CHAR(64)`**: el hash SHA-256 en hexadecimal siempre tiene 64 caracteres.
- **Índice en `usuario_id`**: revocar todas las sesiones de un usuario (logout total, cambio de contraseña, usuario desactivado) filtra por esa columna.
- **No se agrega `reemplazado_por`**: no está en el modelo v1. Para detectar el reuso de un token rotado basta con `revocado_en`: si llega un token ya revocado, S1.5 revoca todas las sesiones del usuario.
- **`valor` es texto**: lo dice el modelo v1 (`siset_schema.sql`). Quien lee el parámetro lo convierte y valida (S1.4); un valor inválido es un error de configuración, no se toma un valor por defecto en silencio.

### 2.2 Migración

Se sigue S0.11 §2.5, sin tocar la migración inicial:

1. `npx prisma migrate dev --name refresh_token_parametro --create-only`.
2. Revisar el SQL generado. Debe crear las dos tablas, el índice único de `token_hash`, el índice de `usuario_id` y la FK con `ON DELETE CASCADE ON UPDATE RESTRICT`.
3. Agregar al final, a mano, la siembra de los dos parámetros de login (así existen en toda base migrada, también en producción, sin depender del seed):

```sql
-- Parámetros de login (business-rules.md §Seguridad). Los cambia Kardex más adelante; el seed no los pisa.
INSERT INTO "parametro" ("clave", "valor", "descripcion", "updated_at") VALUES
  ('MAX_INTENTOS_LOGIN', '5',  'Intentos fallidos seguidos antes de bloquear la cuenta', now()),
  ('MIN_BLOQUEO_LOGIN',  '15', 'Minutos de bloqueo después de superar los intentos', now());
```

4. Aplicar con `npx prisma migrate dev` y verificar que no haya drift (lo cubre `drift.test.ts`).

**Por qué en la migración y no en el seed:** el seed crea el Kardex inicial y exige variables de entorno; los parámetros son reglas del sistema que deben existir apenas se migra. Así, si S1.4 lee un parámetro que falta, es un error real y no un seed olvidado.

### 2.3 Repositorio (`src/modulos/seguridad/refresh-token.repositorio.ts`)

Mismo estilo que `auditoria.repositorio.ts`: funciones que reciben el cliente o la transacción (`ClienteBd | TransaccionBd`), para que S1.3/S1.5 las usen dentro de la misma transacción que el evento de auditoría.

```ts
type Cliente = ClienteBd | TransaccionBd;

export interface NuevoRefreshToken {
  usuarioId: number;
  tokenHash: string; // nunca el token en claro
  expiraEn: Date;
  ip: string | null;
  userAgent: string | null;
}

/** Inserta la sesión y devuelve su id. */
crearRefreshToken(cliente: Cliente, datos: NuevoRefreshToken): Promise<{ id: number }>

/** Busca por hash; devuelve también los revocados y vencidos: decidir qué hacer es tarea del servicio (S1.5). */
buscarRefreshTokenPorHash(cliente: Cliente, tokenHash: string):
  Promise<{ id: number; usuarioId: number; expiraEn: Date; revocadoEn: Date | null } | null>

/**
 * Revoca una sesión solo si sigue activa. Devuelve true si la revocó.
 * false significa que ya estaba revocada: en la rotación, eso es reuso (S1.5).
 */
revocarRefreshToken(cliente: Cliente, id: number, ahora: Date): Promise<boolean>

/** Revoca todas las sesiones activas del usuario. Devuelve cuántas revocó. */
revocarRefreshTokensDeUsuario(cliente: Cliente, usuarioId: number, ahora: Date): Promise<number>
```

- `revocarRefreshToken` usa `updateMany({ where: { id, revocadoEn: null } })` y devuelve `count === 1`. Es atómico: si dos peticiones intentan rotar el mismo token a la vez, solo una gana. Es lo que necesita la rotación de S1.5.
- `ahora` entra como parámetro (no se usa `new Date()` adentro) para poder probar la función.
- El módulo **no exporta nada en `index.ts` todavía**: nadie fuera de `seguridad` debe tocar las sesiones. Se crea `index.ts` vacío con un comentario, para fijar la frontera.

### 2.4 Hash del token (`src/modulos/seguridad/token.ts`)

```ts
/** SHA-256 en hexadecimal (64 caracteres). Es lo único que se guarda del refresh token. */
export const hashDeToken = (token: string): string => createHash('sha256').update(token).digest('hex');
```

Se usa SHA-256 y no bcrypt porque el token es aleatorio y de alta entropía (S1.3 lo generará con `randomBytes(32)`). No hace falta un hash lento, y hace falta buscar por igualdad exacta, cosa que el salt de bcrypt impide.

**Auditoría (DEC-007):** el repositorio no llama a `registrarEvento`, igual que `insertarRegistro` no se audita a sí mismo. El evento de acceso se registra en el servicio del caso de uso, en la misma transacción: `LOGIN` en S1.3 (crea la sesión), `LOGOUT` en S1.5 (la revoca). La rotación del refresh no es un evento de negocio y no se audita; el reuso detectado sí lo será, y lo define S1.5.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                             | Cambio                                                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/prisma/schema/seguridad.prisma`                                  | + `model RefreshToken`; + `refreshTokens RefreshToken[]` en `Usuario` (§2.1).                                                                          |
| `apps/api/prisma/schema/catalogos.prisma`                                  | + `model Parametro` (§2.1).                                                                                                                            |
| `apps/api/prisma/migrations/<fecha>_refresh_token_parametro/migration.sql` | **Nuevo**: lo genera Prisma, más el `INSERT` de §2.2.                                                                                                  |
| `apps/api/src/compartido/bd/generado/**`                                   | Se regenera con `prisma generate`.                                                                                                                     |
| `apps/api/src/modulos/seguridad/index.ts`                                  | **Nuevo**, sin exportaciones (§2.3).                                                                                                                   |
| `apps/api/src/modulos/seguridad/refresh-token.repositorio.ts`              | **Nuevo** (§2.3).                                                                                                                                      |
| `apps/api/src/modulos/seguridad/token.ts`                                  | **Nuevo**: `hashDeToken` (§2.4).                                                                                                                       |
| `apps/api/test/bd/esquema.test.ts`                                         | 8 tablas en vez de 6. La prueba de FK pasa a "todas RESTRICT salvo `refresh_token.usuario_id`, que es CASCADE en borrado y RESTRICT en actualización". |
| `apps/api/test/bd/refresh-token.test.ts`                                   | **Nuevo** (§4).                                                                                                                                        |
| `apps/api/test/bd/parametro.test.ts`                                       | **Nuevo** (§4).                                                                                                                                        |
| `apps/api/test/seguridad-token.test.ts`                                    | **Nuevo**: test unitario de `hashDeToken`.                                                                                                             |
| `docs/decisions/LOG.md`                                                    | DEC-010: `parametro` entra en S1.1 y la auditoría de sesiones vive en el caso de uso (§7.1).                                                           |
| `docs/planning/2026-10-13 - Sprint-Roadmap.md`                             | S1.1 pasa de 2 h a 2,5 h y su nombre incluye `parametro`.                                                                                              |

---

## 4 · Plan de tests

| Caso                                                                                                                         | Nivel                        | Cubre                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------ |
| La base tiene 8 tablas: las 6 de S0.11 más `parametro` y `refresh_token`                                                     | BD (`esquema.test.ts`)       | Migración aplicada                   |
| Todas las FK son RESTRICT, salvo `refresh_token.usuario_id` (CASCADE / RESTRICT)                                             | BD (`esquema.test.ts`)       | Excepción documentada de DEC-006     |
| Ningún id es BIGINT (test existente; ahora incluye `refresh_token`)                                                          | BD                           | DEC-006                              |
| `crearRefreshToken` guarda el hash, la IP (IPv4 e IPv6) y el user agent; `buscarRefreshTokenPorHash` lo encuentra            | BD (`refresh-token.test.ts`) | Repositorio                          |
| Un `token_hash` duplicado falla con violación de unicidad                                                                    | BD                           | `UNIQUE token_hash`                  |
| Un hash de menos de 64 caracteres se rechaza o se rellena (se verifica cuál de los dos hace `CHAR(64)` y se fija en el test) | BD                           | Tipo de columna                      |
| `buscarRefreshTokenPorHash` con un hash inexistente devuelve `null`                                                          | BD                           | Repositorio                          |
| `revocarRefreshToken` devuelve `true` la primera vez y `false` la segunda, sin cambiar `revocado_en`                         | BD                           | Base de la detección de reuso (S1.5) |
| `revocarRefreshTokensDeUsuario` revoca solo las sesiones activas de ese usuario, no las de otro, y devuelve la cantidad      | BD                           | Logout total                         |
| Borrar un usuario en SQL borra sus refresh tokens (CASCADE)                                                                  | BD                           | Excepción de FK                      |
| Una base recién migrada tiene `MAX_INTENTOS_LOGIN = '5'` y `MIN_BLOQUEO_LOGIN = '15'`                                        | BD (`parametro.test.ts`)     | Siembra en la migración              |
| `updated_at` cambia al actualizar un parámetro                                                                               | BD                           | `@updatedAt`                         |
| `prisma migrate diff` sin drift (test existente)                                                                             | BD (`drift.test.ts`)         | El `INSERT` a mano no genera drift   |
| `hashDeToken` devuelve 64 caracteres hexadecimales, es determinista y da hashes distintos para tokens distintos              | Unit                         | §2.4                                 |

**Deliberadamente sin test:**

- Que el token en claro nunca llega a la base: el repositorio solo recibe `tokenHash` y el tipo lo obliga. La prueba de punta a punta (login → fila sin el token) es de S1.3.
- La lectura y conversión de parámetros: no hay código que los lea hasta S1.4.

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S1.1/SDD.md`, Estado = Aprobado.
- [ ] Migración `refresh_token_parametro` aplicada en la CI (`base-de-datos`) sin drift.
- [ ] Solo se guarda el hash SHA-256 del token, nunca el token en claro.
- [ ] Tests de §4 en verde (`npm run test` y `npm run test:bd`).
- [ ] Auditoría: no aplica en este ticket (§2.4). Queda escrito en DEC-010 para que S1.3 y S1.5 no lo olviden.
- [ ] DEC-010 en `LOG.md` y roadmap actualizado (§3).
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commit `S1.1 …` en la rama `feat/S1.1-refresh-token`.

---

## 6 · Riesgos

| Riesgo                                                                                | Gravedad                                               | Mitigación                                                                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| La tabla `refresh_token` crece sin límite: una fila por login y por cada rotación     | Baja en el piloto (un puñado de usuarios del personal) | La limpieza de filas vencidas o revocadas se agrega con S1.5 o S6.x. Se anota en el SDD de S1.5. |
| El `INSERT` hecho a mano en la migración genera drift o Prisma lo reescribe           | Baja                                                   | Los datos no forman parte del esquema; `drift.test.ts` lo confirma.                              |
| Prisma 7 trata distinto `@db.Char(64)` o `onDelete: Cascade` con `onUpdate: Restrict` | Baja                                                   | Se revisa el SQL generado (§2.2, paso 2) y los tests de FK y de `CHAR(64)` lo fijan.             |
| La base local de desarrollo no tiene la migración                                     | Baja                                                   | `prisma migrate dev` la aplica sin reset: es una migración nueva, no reemplaza a otra.           |

---

## 7 · Preguntas abiertas

1. **`parametro` en S1.1 (va a `LOG.md` como DEC-010).** El ticket no lo nombra, pero el modelo de datos y el SDD de S0.11 sí lo asignan a S1.1. Se incluye. Además, la auditoría de las sesiones se registra en el caso de uso (S1.3/S1.5) y no en el repositorio.
2. **¿Cuánto dura el refresh token?** Ni el PRD ni `business-rules.md` lo dicen. Solo fijan el access de 15 min y el cierre por 15 min de inactividad. Es una decisión técnica y no una pregunta para la escuela: la cierra el SDD de S1.3/S1.5, con propuesta "una jornada de trabajo (8 h), que se renueva con cada rotación mientras haya actividad". No bloquea S1.1: aquí solo se guarda `expira_en`.
