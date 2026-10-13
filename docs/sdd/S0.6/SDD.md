# SDD — S0.6 · Esquema Prisma inicial, migración y seed

- **Ticket:** ClickUp **S0.6** (`868mgh287`, https://app.clickup.com/t/868mgh287).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §5 (Modelo de datos: `rol`, `usuario`, `sede`, `especialidad`, `log_auditoria`; convenciones; RNF-01, RNF-03)
  2. `docs/product/business-rules.md` §Convenciones de datos, §Seguridad y acceso, §Bitácora
  3. `docs/product/dudas.md` — D-02 (Prisma), D-14 (CI como usuario), D-17 (bitácora desde la API), D-12 (infraestructura)
  4. `docs/adr/0001-monolito-modular.md` (tabla de módulos dueños)
  5. `docs/decisions/LOG.md` — DEC-002, DEC-004 (Prisma 7.10), DEC-005 (PostgreSQL 18, `db` en S0.6, bcryptjs)
  6. `docs/planning/2026-10-12-tickets/S0.6-prisma-inicial.json`

---

## 1 · Alcance

### Entra

- Prisma 7.10 en `apps/api`, con el esquema partido por módulo dueño (ADR-0001).
- Modelos `rol`, `usuario`, `sede`, `especialidad` y `log_auditoria`, con los campos que fija el ticket.
- La migración inicial (SQL versionado) y la zona horaria `America/La_Paz` en la base.
- Un seed idempotente: 6 roles, 2 sedes, 5 especialidades y un usuario KARDEX inicial tomado de variables de entorno.
- `docker-compose.yml` mínimo con el servicio `db` (PostgreSQL 18), según DEC-005.
- Un cliente Prisma compartido en `src/compartido/bd/`.
- Tests de integración contra una base real (`npm run test:bd`).

### No entra (a propósito)

- Campos de bloqueo (`intentos_fallidos`, `bloqueado_hasta`, `debe_cambiar_password`) y la tabla `refresh_token` → **S1.1**.
- Tablas de files, hojas de ruta, pases, etc. → sus tickets (S2.1, S3.x…).
- Hacer `log_auditoria` inmutable (sin UPDATE ni DELETE por permisos de BD) → **S6.4**. Aquí solo se crea la tabla.
- Repositorios y servicios de los módulos → S0.7 y S1.x. Este ticket no crea carpetas en `src/modulos/`.
- Servicios api, web y Nginx en compose → **S0.4**.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                                                 | Qué hay de verdad en el repo                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Depende de S0.4 (Docker Compose)                                                   | ⚠️ S0.4 no está hecho. S0.6 crea el compose con solo `db` (DEC-005).                                                                                                                        |
| PostgreSQL 16 (PRD §5)                                                             | ⚠️ Se usa 18 (DEC-005, provisional por D-12).                                                                                                                                               |
| Prisma (D-02, provisional)                                                         | ✅ Se usa Prisma **7.10**. El dist-tag `latest` de npm apunta a una 8.0-rc, así que se fija la versión exacta.                                                                              |
| Reusar los códigos de `apps/web/src/config/catalogos.ts` y `config/permisos.ts`    | ✅ 6 roles (`ESTUDIANTE`, `EGRESADO`, `SEC_DIR`, `SEC_COORD`, `COORDINADOR`, `KARDEX`), 2 sedes (`LA_PAZ` "Sede Central La Paz", `ANCOCAGUA` "UA Ancocagua (Pucarani)") y 5 especialidades. |
| `usuario` (id, rol_id, ci único, nombres, apellidos, password_hash, email, activo) | ✅ Coincide con PRD §5 y D-14. ⚠️ El prototipo tiene además `usuario` (alias de login) y `sedeId`, que **no figuran en el PRD**. No se agregan (ver §7).                                    |
| Hash con bcrypt                                                                    | ⚠️ Se usa `bcryptjs` (DEC-005).                                                                                                                                                             |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo          | Rol en este ticket | API pública que agrega o consume (`index.ts`)          | Tablas propias que toca |
| --------------- | ------------------ | ------------------------------------------------------ | ----------------------- |
| `seguridad`     | dueño              | — (los repositorios llegan en S1.x)                    | `rol`, `usuario`        |
| `catalogos`     | dueño              | —                                                      | `sede`, `especialidad`  |
| `auditoria`     | dueño              | —                                                      | `log_auditoria`         |
| `compartido/bd` | infraestructura    | `crearClienteBd()`, tipo `ClienteBd` / `TransaccionBd` | —                       |

### 2.1 Prisma 7: piezas y por qué

Prisma 7 ya no lee la URL de conexión desde el `schema.prisma`, no trae motor
nativo en Rust y genera el cliente como código TS dentro del proyecto. Por eso
este diseño usa:

- **`apps/api/prisma.config.ts`** con `schema: 'prisma/schema'` (carpeta),
  `migrations.path: 'prisma/migrations'`, `migrations.seed: 'tsx prisma/seed.ts'`
  y `datasource.url` desde `DATABASE_URL`. Las variables se cargan con
  `process.loadEnvFile()` de Node 26, sin la dependencia `dotenv`; el archivo
  `.env` es opcional, y en la CI las variables vienen del entorno.
- **Generador `prisma-client`** (ESM) con
  `output = "../../src/compartido/bd/generado"` (carpeta en `.gitignore`).
  El cliente queda en `compartido/` porque es infraestructura sin lógica de
  negocio (regla 4 de ADR-0001). Los módulos lo usan desde sus repositorios.
- **Driver adapter `@prisma/adapter-pg`** (sobre `pg`). Es el modo estándar de
  Prisma 7 y evita binarios nativos.
- **Esquema multiarchivo**: un `.prisma` por módulo dueño. Esto responde la
  pregunta que ADR-0001 dejó para este SDD: se parte en archivos, para que
  la propiedad de cada tabla se vea en el árbol de archivos y cada ticket
  de módulo toque solo su archivo.

```
apps/api/prisma/
  schema/
    base.prisma        # generator + datasource
    seguridad.prisma   # Rol, Usuario
    catalogos.prisma   # Sede, Especialidad
    auditoria.prisma   # LogAuditoria
  migrations/
    <timestamp>_inicial/migration.sql
  seed.ts
```

### 2.2 Convenciones de mapeo

| Convención (business-rules §Convenciones)          | En Prisma                                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tablas y columnas en `snake_case` español (PRD §5) | Modelos en `PascalCase` y campos en `camelCase`, con `@@map("tabla")` y `@map("columna")`. El código TS queda idiomático y el SQL respeta el PRD.                                                                                                                                     |
| `id BIGSERIAL`                                     | `id BigInt @id @default(autoincrement())` en **todas** las tablas, catálogos incluidos (la regla no distingue).                                                                                                                                                                       |
| `TIMESTAMPTZ`                                      | `DateTime @db.Timestamptz(6)`.                                                                                                                                                                                                                                                        |
| Zona America/La_Paz                                | La migración ejecuta `ALTER DATABASE <actual> SET timezone TO 'America/La_Paz'` (vía `current_database()`, así funciona en la base de desarrollo, la de test y la de la CI). Los instantes se guardan igual en UTC; la zona afecta `now()::date`, `date_trunc` y la salida de `psql`. |
| `created_at` / `updated_at` en tablas operativas   | Solo en `usuario`. `rol`, `sede` y `especialidad` son catálogos. `log_auditoria` es append-only y solo tiene `fecha`.                                                                                                                                                                 |
| FK `ON DELETE RESTRICT`                            | `onDelete: Restrict, onUpdate: Restrict` **explícito** en cada relación (el default de Prisma cambia según la relación sea opcional o no).                                                                                                                                            |
| Borrado lógico                                     | `activo Boolean @default(true)` en `usuario` y `especialidad`. Ninguna tabla se borra físicamente desde la app.                                                                                                                                                                       |

### 2.3 Modelos

```prisma
// seguridad.prisma
model Rol {
  id       BigInt    @id @default(autoincrement())
  codigo   String    @unique @db.VarChar(20)   // ESTUDIANTE … KARDEX
  nombre   String    @db.VarChar(60)
  usuarios Usuario[]
  @@map("rol")
}

model Usuario {
  id           BigInt   @id @default(autoincrement())
  rolId        BigInt   @map("rol_id")
  ci           String   @unique @db.VarChar(20)  // D-14: CI como usuario; texto (admite complemento)
  nombres      String   @db.VarChar(100)
  apellidos    String   @db.VarChar(100)
  passwordHash String   @map("password_hash") @db.VarChar(100)
  email        String?  @db.VarChar(150)
  activo       Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  rol          Rol      @relation(fields: [rolId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  registrosAuditoria LogAuditoria[]
  @@index([rolId])
  @@map("usuario")
}

// catalogos.prisma
model Sede {
  id     BigInt @id @default(autoincrement())
  codigo String @unique @db.VarChar(20)   // LA_PAZ, ANCOCAGUA
  nombre String @db.VarChar(100)
  @@map("sede")
}

model Especialidad {
  id     BigInt  @id @default(autoincrement())
  nombre String  @unique @db.VarChar(120)
  activo Boolean @default(true)
  @@map("especialidad")
}

// auditoria.prisma
model LogAuditoria {
  id           BigInt   @id @default(autoincrement())
  usuarioId    BigInt   @map("usuario_id")
  accion       String   @db.VarChar(50)
  modulo       String   @db.VarChar(30)
  entidad      String   @db.VarChar(50)
  entidadId    String?  @map("entidad_id") @db.VarChar(50)
  datosAntes   Json?    @map("datos_antes")   // JSONB
  datosDespues Json?    @map("datos_despues") // JSONB
  ip           String?  @db.VarChar(45)        // IPv6 cabe en 45
  fecha        DateTime @default(now()) @db.Timestamptz(6)
  usuario      Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  @@index([fecha])
  @@index([usuarioId, fecha])
  @@index([modulo, fecha])
  @@map("log_auditoria")
}
```

Decisiones puntuales:

- **`ci` es texto, no número**: el CI boliviano puede llevar complemento
  (por ejemplo, `1234567-1A`; D-14 lo menciona) y los ceros a la izquierda importan.
- **`especialidad.nombre` es `@unique`**: el seed necesita una clave natural
  para ser idempotente, y dos especialidades con el mismo nombre serían un error de datos.
- **`entidad_id` es texto**: la bitácora apunta a entidades de cualquier
  módulo (algunas con id `BigInt`, otras con clave natural como `HR-2026-000123`).
- **`usuario_id` NOT NULL** en `log_auditoria`: el PRD no define eventos
  anónimos. Pasarlo después a nullable es una migración trivial; lo inverso
  exigiría completar datos (ver §7).
- **Índices** de `log_auditoria`: siguen a RF-14 CA3 (Kardex filtra por fecha, usuario y módulo).
- **Sin `CHECK` de valores** en `rol.codigo` ni `sede.codigo`: son catálogos
  cerrados que solo escribe el seed. Las validaciones de valores van en Zod (S0.7).

### 2.4 Cliente compartido (`src/compartido/bd/`)

```ts
// cliente.ts
export type ClienteBd = PrismaClient;
export type TransaccionBd = Prisma.TransactionClient; // lo que reciben los servicios públicos (ADR-0001 regla 3)
export function crearClienteBd(url = process.env.DATABASE_URL): ClienteBd; // lanza Error si falta url
```

Usa `new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })`.
No exporta una instancia global: S0.7 decide el ciclo de vida, cuando la app
lo cree al arrancar. Así los tests pueden apuntar a otra base.

**`BigInt` y JSON**: `JSON.stringify` falla con `BigInt`. Este ticket no
serializa nada hacia HTTP; S0.7 define cómo se convierte en las respuestas.
Queda anotado como riesgo para S0.7 (§6).

### 2.5 Seed (`prisma/seed.ts`)

- Valores **copiados** de `apps/web/src/config/catalogos.ts` y `permisos.ts`
  (mismos códigos y nombres), no importados: la API no debe depender del
  frontend. El test de §4 compara ambos para que no se desincronicen.
- Todo con `upsert` por clave natural (`rol.codigo`, `sede.codigo`,
  `especialidad.nombre`, `usuario.ci`), dentro de una sola transacción.
- **Kardex inicial**: CI desde `SEED_KARDEX_CI` y contraseña desde
  `SEED_KARDEX_PASSWORD`. Si falta alguna, el seed falla con un mensaje claro.
  La contraseña se valida contra la regla de business-rules (mínimo 8
  caracteres, con letras y números) y se hashea con `bcryptjs`, costo 12
  (RNF-01). En el `upsert` del usuario, el `update` **no** toca
  `password_hash`: si se vuelve a correr el seed, no se pisa una contraseña
  que Kardex ya cambió.
- Nombres del Kardex inicial: `SEED_KARDEX_NOMBRES` y `SEED_KARDEX_APELLIDOS`,
  con valores por defecto `Kardex` / `Inicial`.
- Nunca imprime la contraseña ni el hash (RNF-01). Al final informa solo los conteos.

### 2.6 Base de datos local (`docker-compose.yml`, DEC-005)

```yaml
services:
  db:
    image: postgres:18-alpine
    environment: { POSTGRES_DB: siset, POSTGRES_USER: siset, POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-siset_dev}, TZ: America/La_Paz, PGTZ: America/La_Paz }
    ports: ["127.0.0.1:${DB_PORT:-5432}:5432"]
    volumes: [siset_db:/var/lib/postgresql]
    healthcheck: pg_isready
volumes: { siset_db: {} }
```

- Solo se expone en `127.0.0.1`. Las credenciales de desarrollo están en
  `apps/api/.env.example`; nunca hay credenciales reales en el repo.
- Volumen en `/var/lib/postgresql`: desde PostgreSQL 18, la imagen oficial
  guarda los datos en un subdirectorio por versión, y montar el directorio
  padre es lo que pide la imagen.
- La base de test (`siset_test`) la crea el propio script `test:bd`
  (`prisma migrate reset --force` sobre `DATABASE_URL_TEST`). No hace falta un
  init-script en compose.

### 2.7 Scripts (`apps/api/package.json`)

| Script         | Comando                                                        |
| -------------- | -------------------------------------------------------------- |
| `bd:generar`   | `prisma generate`                                              |
| `bd:migrar`    | `prisma migrate dev`                                           |
| `bd:desplegar` | `prisma migrate deploy`                                        |
| `bd:seed`      | `prisma db seed`                                               |
| `postinstall`  | `prisma generate` (sin el cliente generado, `typecheck` falla) |
| `test:bd`      | `vitest run --config vitest.bd.config.ts`                      |

`test` (unitario) **excluye** `test/bd/**`. `vitest.bd.config.ts` incluye
solo `test/bd/**`, corre en serie (una sola base) y antes de empezar aplica
`migrate reset --force --skip-seed` sobre `DATABASE_URL_TEST`.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                       | Cambio                                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml` (raíz)                                          | **Nuevo**: solo el servicio `db` (§2.6).                                                                                                                                                                |
| `apps/api/package.json`                                              | Dependencias `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`, `pg`, `bcryptjs`. Dev: `prisma@7.10.0`, `@types/pg`. Versiones de Prisma **exactas** (el dist-tag `latest` es una rc). Scripts §2.7. |
| `apps/api/prisma.config.ts`                                          | **Nuevo** (§2.1).                                                                                                                                                                                       |
| `apps/api/prisma/schema/{base,seguridad,catalogos,auditoria}.prisma` | **Nuevos** (§2.3).                                                                                                                                                                                      |
| `apps/api/prisma/migrations/<ts>_inicial/migration.sql`              | **Nuevo**, generado con `migrate dev --name inicial`, más el `ALTER DATABASE … timezone` agregado a mano al final (se documenta con un comentario en el SQL).                                           |
| `apps/api/prisma/seed.ts`                                            | **Nuevo** (§2.5).                                                                                                                                                                                       |
| `apps/api/src/compartido/bd/cliente.ts`, `index.ts`                  | **Nuevos** (§2.4).                                                                                                                                                                                      |
| `apps/api/src/compartido/.gitkeep`                                   | Se elimina (la carpeta ya tiene contenido).                                                                                                                                                             |
| `apps/api/.env.example`                                              | Agrega `DATABASE_URL`, `DATABASE_URL_TEST`, `POSTGRES_PASSWORD`, `SEED_KARDEX_CI`, `SEED_KARDEX_PASSWORD` (con valores de desarrollo, nunca reales), `SEED_KARDEX_NOMBRES` y `SEED_KARDEX_APELLIDOS`.   |
| `.gitignore`                                                         | Agrega `apps/api/src/compartido/bd/generado/`.                                                                                                                                                          |
| `eslint.config.js`                                                   | Ignora `**/generado/**`.                                                                                                                                                                                |
| `.prettierignore`                                                    | Agrega `**/generado` y `**/migrations/**/*.sql`.                                                                                                                                                        |
| `apps/api/vitest.config.ts`                                          | `exclude: ['test/bd/**', …defaults]`.                                                                                                                                                                   |
| `apps/api/vitest.bd.config.ts`                                       | **Nuevo** (§2.7).                                                                                                                                                                                       |
| `apps/api/test/bd/*.test.ts`                                         | **Nuevos** (§4).                                                                                                                                                                                        |
| `apps/api/test/catalogos-seed.test.ts`                               | **Nuevo**, unitario: seed vs prototipo (§4).                                                                                                                                                            |
| `README.md`                                                          | Pasos: `docker compose up -d db`, `npm run bd:migrar -w @siset/api`, `npm run bd:seed -w @siset/api`, `npm run test:bd -w @siset/api`.                                                                  |
| `docs/sdd/S0.3/SDD.md`                                               | Estado → `Implementado (2026-10-13)` (pendiente heredado de S0.3).                                                                                                                                      |
| `docs/planning/2026-10-12-tickets/S0.10-web-stack-vigente.json`      | Se agrega (cuerpo del ticket ya creado en ClickUp).                                                                                                                                                     |

Commits en `feat/S0.6-prisma-inicial`:

1. `S0.6 SDD del esquema Prisma inicial y DEC-005`
2. `S0.6 agrega PostgreSQL 18 en docker compose y Prisma 7 con esquema por módulo`
3. `S0.6 migración inicial y seed idempotente`
4. `S0.6 tests de base de datos y del seed`

---

## 4 · Plan de tests

| Caso                                                                                                                  | Nivel                                         | Cubre                                                           |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| `migrate reset` aplica la migración limpia sobre una base vacía                                                       | integración (`test:bd`)                       | DoD "aplica limpio".                                            |
| Las 5 tablas existen con los nombres `snake_case` del PRD                                                             | integración (`information_schema`)            | Mapeo §2.2.                                                     |
| Todas las FK tienen `ON DELETE RESTRICT` (consulta a `pg_constraint`, `confdeltype = 'r'`)                            | integración                                   | RNF-03, DoD.                                                    |
| Borrar un `rol` que tiene usuarios falla con violación de FK                                                          | integración                                   | RESTRICT en la práctica, no solo en el catálogo del sistema.    |
| `SHOW timezone` devuelve `America/La_Paz` en una conexión nueva                                                       | integración                                   | Zona horaria.                                                   |
| Correr el seed dos veces deja 6 roles, 2 sedes, 5 especialidades y 1 usuario                                          | integración                                   | DoD "idempotente".                                              |
| La segunda corrida del seed no cambia `password_hash`                                                                 | integración                                   | Que no se pise una contraseña cambiada.                         |
| El hash del Kardex inicial verifica con `bcryptjs.compare` y su costo es 12 (`$2b$12$` o `$2a$12$`)                   | integración                                   | RNF-01.                                                         |
| El seed falla con un mensaje claro si falta `SEED_KARDEX_PASSWORD` o si no cumple la regla de contraseña              | unitario                                      | Que no se pueda crear un Kardex sin contraseña o con una débil. |
| Los códigos y nombres de roles y sedes, y las especialidades del seed, son idénticos a los de `apps/web/src/config/*` | unitario (lee los archivos de web como texto) | DoD "códigos idénticos al prototipo".                           |
| `crearClienteBd()` sin URL lanza un error                                                                             | unitario                                      | Falla temprana.                                                 |

**Deliberadamente sin test:**

- La inmutabilidad de `log_auditoria`: es S6.4.
- El contenido del compose: lo cubre que `test:bd` corra contra él.

**Cómo se corren:** `docker compose up -d db`, luego `npm run test:bd -w @siset/api`.
`npm test` en la raíz no necesita Docker. La CI (S0.5) debe correr también
`test:bd` con un service container de PostgreSQL 18 (anotado para el SDD de S0.5).

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] `docker compose up -d db` levanta PostgreSQL 18 sano (healthcheck)
- [ ] `prisma migrate dev` aplica limpio sobre una base vacía
- [ ] El seed es idempotente (dos corridas, mismos conteos y mismo hash)
- [ ] Las FK son `ON DELETE RESTRICT` en el SQL de la migración y en `pg_constraint`
- [ ] Los códigos de rol y sede son idénticos a los del prototipo (test)
- [ ] Ni la contraseña ni el hash aparecen en la salida del seed ni en el repo
- [ ] `npm run test:bd -w @siset/api` en verde
- [ ] Gate de la raíz en verde: `typecheck`, `lint`, `test`, `build`
- [ ] Commits `S0.6 …` en `feat/S0.6-prisma-inicial`, con PR a `main`

---

## 6 · Riesgos

| Riesgo                                                                                                                                    | Gravedad          | Mitigación                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Prisma 7 cambió la configuración (`prisma.config.ts`, adapter, generator nuevo) y la documentación de terceros suele estar desactualizada | Media             | Se sigue la documentación oficial de 7.x. Si algo no calza, se versiona este SDD (§2.1) antes de improvisar.       |
| `BigInt` en los ids no se serializa a JSON                                                                                                | Media (para S0.7) | Fuera de este ticket. Se anota en el ticket S0.7: definir la conversión (por ejemplo, ids como string en los DTO). |
| `postinstall: prisma generate` falla en entornos sin el esquema (por ejemplo, un `npm ci` parcial)                                        | Baja              | El esquema siempre está en el repo y `prisma generate` no necesita conexión a la base.                             |
| El puerto 5432 está ocupado en la máquina de desarrollo                                                                                   | Baja              | `DB_PORT` configurable en compose y en `DATABASE_URL`.                                                             |
| D-12 impone PostgreSQL 16 en el servidor institucional                                                                                    | Baja              | El esquema no usa nada propio de la 18. Bajar de versión es cambiar la imagen.                                     |
| El seed se desincroniza del prototipo                                                                                                     | Baja              | Lo cubre el test unitario de comparación.                                                                          |

---

## 7 · Preguntas abiertas

1. **¿El usuario tiene sede?** El prototipo asigna `sedeId` al personal (SEC_DIR
   en La Paz, Kardex en Ancocagua), y los pases entre sedes (M5) probablemente lo
   necesitan, pero `usuario` en PRD §5 no tiene `sede_id`. No se agrega aquí:
   se decide en S1.x o en S3.x, con DEC.
2. **¿Hay alias de login además del CI?** El prototipo usa `kardex`, `secdir`,
   etc. D-14 (provisional) dice CI como usuario. Se sigue D-14; los alias son
   solo de la demo.
3. **¿Hay eventos de bitácora sin usuario?** Por ejemplo, un login fallido con un
   CI inexistente. Hoy `usuario_id` es NOT NULL; se revisa en S1.x / S6.4.
