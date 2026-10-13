# SDD — S0.11 · Rehacer la migración inicial según el modelo de datos v1

- **Ticket:** ClickUp **S0.11** (`868mgu855`, https://app.clickup.com/t/868mgu855).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/modelo-datos.md` (modelo v1: §Convenciones, §personas, §seguridad, §catalogos, §auditoria)
  2. `docs/decisions/LOG.md` — DEC-006 (adopción, ids `INTEGER`, módulo `personas`, rehacer S0.6), DEC-005, DEC-004
  3. `docs/adr/0001-monolito-modular.md` (+ enmienda `personas`), `docs/adr/0002-autorizacion-casbin.md`
  4. `docs/bd-tentaiva/ANALISIS.md` §3 (E1 y E2 aplican a las tablas de este ticket)
  5. `docs/sdd/S0.6/SDD.md` v1.1: Prisma 7, compose, cliente y `test:bd` **no cambian** (se citan, no se repiten)
  6. `docs/product/business-rules.md` §Seguridad (regla de contraseña), §Bitácora; `docs/product/dudas.md` D-15, D-24, D-25, D-26

---

## 1 · Alcance

### Entra

- **Reemplazar** la migración `20261013151642_inicial` por una nueva migración inicial con:
  `persona`, `rol`, `usuario`, `sede`, `especialidad` y `log_auditoria`, según el modelo v1.
- Nuevo archivo de esquema `personas.prisma` (módulo `personas`, enmienda de ADR-0001).
- Ids `Int` (`SERIAL`); ningún `BigInt`.
- SQL escrito a mano en la migración: `CHECK`, triggers de solo inserción de `log_auditoria` (incluido `TRUNCATE`) y zona horaria.
- Seed: persona + usuario del Kardex inicial; `rol.descripcion`; sede del Kardex.
- Tests de S0.6 adaptados, más los nuevos de §4.
- **ADR-0003** (bitácora, `do-not-touch`): append-only desde la creación y `usuario_id` nullable.

### No entra (a propósito)

- `refresh_token` y `parametro` → S1.1. `requisito_tipo`, `tipo_tramite`, `tipo_tramite_requisito` y las tablas de files → S2.1. Trámites → S3.x.
- `REVOKE` de permisos sobre `log_auditoria` al rol de la app → S6.4 (hace falta separar el rol dueño del rol de la app; eso se decide en S0.4/S0.9).
- Repositorios y servicios de `personas`, `seguridad` y `auditoria` → S0.7 / S1.x.
- Política de Casbin → S1.x (ADR-0002).

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                               | Qué hay de verdad en el repo                                                                                                                                                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hay una sola migración inicial de S0.6 en `main` | ✅ `20261013151642_inicial`.                                                                                                                                                                                                                         |
| El esquema usa `BigInt`                          | ✅ 7 apariciones en `prisma/schema/*.prisma`.                                                                                                                                                                                                        |
| Rehacer la migración no afecta a nadie           | ⚠️ No hay bases desplegadas, pero **la base local `siset` tiene la migración vieja aplicada**: Prisma pedirá `migrate reset`, que está bloqueado para agentes de IA. Se recrea la base local (§2.6), **con autorización explícita del responsable**. |
| `crearClienteBd` sin cambios                     | ✅ No depende del esquema.                                                                                                                                                                                                                           |
| Hay que ajustar el seed y los tests              | ✅ Cambian `prisma/semilla.ts`, `test/semilla.test.ts`, `test/bd/semilla.test.ts`, `test/bd/esquema.test.ts` y `.env.example`.                                                                                                                       |
| `CHECK` y triggers como SQL en la migración      | ⚠️ Prisma no los modela: se verifica que `migrate diff` no reporte drift (test §4).                                                                                                                                                                  |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket | API pública (`index.ts`)            | Tablas propias que toca |
| ----------- | ------------------ | ----------------------------------- | ----------------------- |
| `personas`  | **nuevo**, dueño   | — (llega con su primer caso de uso) | `persona`               |
| `seguridad` | dueño              | —                                   | `rol`, `usuario`        |
| `catalogos` | dueño              | —                                   | `sede`, `especialidad`  |
| `auditoria` | dueño              | —                                   | `log_auditoria`         |

Este ticket no crea carpetas en `src/modulos/`: solo esquema, migración y seed.

### 2.1 Esquema (`apps/api/prisma/schema/`)

`base.prisma` no cambia. Tipos y tamaños según `docs/bd-tentaiva/siset_schema.sql`, salvo lo que corrige
el modelo v1.

```prisma
// personas.prisma (NUEVO) — módulo personas
model Persona {
  id              Int       @id @default(autoincrement())
  ci              String    @db.VarChar(15)
  /// '' cuando no tiene. NOT NULL para que UNIQUE (ci, complemento) no admita duplicados (E1).
  complemento     String    @default("") @db.VarChar(5)
  nombres         String    @db.VarChar(80)
  apellidoPaterno String?   @map("apellido_paterno") @db.VarChar(60)
  apellidoMaterno String?   @map("apellido_materno") @db.VarChar(60)
  fechaNacimiento DateTime? @map("fecha_nacimiento") @db.Date
  celular         String?   @db.VarChar(20)
  email           String?   @db.VarChar(120)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  usuario         Usuario?
  @@unique([ci, complemento])
  @@map("persona")
}

// seguridad.prisma
model Rol {
  id          Int       @id @default(autoincrement())
  codigo      String    @unique @db.VarChar(20)
  nombre      String    @db.VarChar(80)     // el del prototipo
  descripcion String?   @db.VarChar(255)    // nombre institucional largo
  usuarios    Usuario[]
  @@map("rol")
}

model Usuario {
  id                  Int            @id @default(autoincrement())
  personaId           Int            @unique @map("persona_id")
  rolId               Int            @map("rol_id")
  sedeId              Int?           @map("sede_id")                 // NULL para estudiante/egresado (D-24)
  username            String         @unique @db.VarChar(40)         // = CI[-complemento] (D-14/D-25)
  passwordHash        String         @map("password_hash") @db.VarChar(100)
  activo              Boolean        @default(true)
  intentosFallidos    Int            @default(0) @map("intentos_fallidos") @db.SmallInt
  bloqueadoHasta      DateTime?      @map("bloqueado_hasta") @db.Timestamptz(6)
  debeCambiarPassword Boolean        @default(true) @map("debe_cambiar_password")
  ultimoAcceso        DateTime?      @map("ultimo_acceso") @db.Timestamptz(6)
  createdAt / updatedAt (igual que persona)
  persona             Persona        @relation(fields: [personaId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  rol                 Rol            @relation(fields: [rolId],     references: [id], onDelete: Restrict, onUpdate: Restrict)
  sede                Sede?          @relation(fields: [sedeId],    references: [id], onDelete: Restrict, onUpdate: Restrict)
  registrosAuditoria  LogAuditoria[]
  @@index([rolId])
  @@index([sedeId])
  @@map("usuario")
}

// catalogos.prisma
model Sede {
  id        Int       @id @default(autoincrement())
  codigo    String    @unique @db.VarChar(20)
  nombre    String    @db.VarChar(100)
  direccion String?   @db.VarChar(200)
  activo    Boolean   @default(true)
  usuarios  Usuario[]   // back-relation exigida por Prisma (ver nota)
  @@map("sede")
}
model Especialidad { id Int @id @default(autoincrement()); nombre @unique VarChar(120); activo }  // solo cambia el tipo de id

// auditoria.prisma
model LogAuditoria {
  id           Int      @id @default(autoincrement())
  usuarioId    Int?     @map("usuario_id")      // nullable (DEC-006 #5; no cierra D-26)
  accion       String   @db.VarChar(40)
  modulo       String   @db.VarChar(40)
  entidad      String?  @db.VarChar(40)
  entidadId    String?  @map("entidad_id") @db.VarChar(40)
  datosAntes   Json?    @map("datos_antes")
  datosDespues Json?    @map("datos_despues")
  ip           String?  @db.Inet
  userAgent    String?  @map("user_agent") @db.VarChar(255)
  fecha        DateTime @default(now()) @db.Timestamptz(6)
  usuario      Usuario? @relation(fields: [usuarioId], references: [id], onDelete: Restrict, onUpdate: Restrict)
  @@index([fecha(sort: Desc)])
  @@index([usuarioId, fecha(sort: Desc)])
  @@index([modulo, fecha(sort: Desc)])
  @@map("log_auditoria")
}
```

**Nota sobre las back-relations entre módulos:** Prisma exige el campo inverso (`Sede.usuarios`,
`Persona.usuario`) en el modelo del otro módulo. Es solo un artefacto del esquema: la regla de ADR-0001
("cada tabla tiene un dueño; solo su repositorio la escribe") se aplica al **código**, no al esquema. Los
campos inversos se marcan con un comentario `/// back-relation (ADR-0001: no usar desde otro módulo)`.

### 2.2 SQL agregado a mano al final de la migración

Con un encabezado que remite a `docs/product/modelo-datos.md` y a este SDD:

```sql
-- persona: al menos un apellido
ALTER TABLE persona ADD CONSTRAINT ck_persona_apellido
  CHECK (apellido_paterno IS NOT NULL OR apellido_materno IS NOT NULL);
-- usuario: contador no negativo
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_intentos CHECK (intentos_fallidos >= 0);

-- log_auditoria: solo inserción (ADR-0003). Por fila para UPDATE/DELETE y por sentencia para TRUNCATE (E2).
CREATE FUNCTION fn_solo_insercion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo inserción: no se permite %', TG_TABLE_NAME, TG_OP;
END $$;
CREATE TRIGGER tg_auditoria_inmutable BEFORE UPDATE OR DELETE ON log_auditoria
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();
CREATE TRIGGER tg_auditoria_sin_truncate BEFORE TRUNCATE ON log_auditoria
  FOR EACH STATEMENT EXECUTE FUNCTION fn_solo_insercion();

-- zona horaria (igual que S0.6)
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/La_Paz'); END $$;
```

`fn_solo_insercion()` queda genérica: S3.x la reutiliza para `movimiento_hoja_ruta`.

### 2.3 Seed (`prisma/semilla.ts`)

- `ROLES`: se agrega `descripcion` con los nombres institucionales del modelo tentativo ("Estudiante en formación", "Maestro egresado", "Secretaría de Dirección General", "Secretaría de Coordinación", "Coordinador Académico", "Responsable de Archivo Kardex"). `nombre` sigue siendo el del prototipo (lo verifica el test existente).
- `SEDES` y `ESPECIALIDADES` no cambian (`direccion` queda NULL).
- **Kardex inicial** (`leerKardexInicial`), variables:

| Variable                       | Obligatoria | Default                        | Validación                                                                    |
| ------------------------------ | ----------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `SEED_KARDEX_CI`               | sí          | —                              | no vacío                                                                      |
| `SEED_KARDEX_COMPLEMENTO`      | no          | `''`                           | ≤ 5 caracteres                                                                |
| `SEED_KARDEX_PASSWORD`         | sí          | —                              | regla de business-rules (mín. 8, letras y números); nunca aparece en un error |
| `SEED_KARDEX_NOMBRES`          | no          | `Kardex`                       | —                                                                             |
| `SEED_KARDEX_APELLIDO_PATERNO` | no          | `Inicial`                      | al menos un apellido (igual que el `CHECK`)                                   |
| `SEED_KARDEX_APELLIDO_MATERNO` | no          | —                              | —                                                                             |
| `SEED_KARDEX_SEDE`             | no          | `ANCOCAGUA` (D-15 provisional) | debe ser un código de `SEDES`                                                 |

`SEED_KARDEX_APELLIDOS` desaparece (se reemplaza por paterno y materno).

- `sembrar()`, dentro de una transacción como hoy:
  1. Hace upsert de roles (incluida la descripción), sedes y especialidades.
  2. Hace upsert de `persona` por `ci_complemento`; el `update` está vacío.
  3. Hace upsert de `usuario` por `username`, con `update` vacío para no pisar una contraseña ya cambiada. Al crearlo: `username = ci` o `ci-complemento`, rol KARDEX, la sede indicada y `debeCambiarPassword: true`, porque la contraseña viene de una variable de entorno y Kardex debe cambiarla al primer ingreso (S1.x).
  4. Devuelve `{ roles, sedes, especialidades, personas, usuarios }`.

### 2.4 Formato de `username`

`ci` si no hay complemento; `ci-complemento` si lo hay (por ejemplo, `1234567-1A`). Es el formato que
mostrará el login (S1.x, D-14). Si D-25 decide alias para el personal, solo cambia cómo se llena el
campo, no el esquema.

### 2.5 Cómo se reemplaza la migración

1. Borrar `prisma/migrations/20261013151642_inicial/`.
2. Recrear la base local (§2.6).
3. `prisma migrate dev --name inicial --create-only`, agregar el SQL de §2.2 y aplicar con `prisma migrate dev`.
4. Verificar con `prisma migrate diff` (base contra esquema) que no haya drift.

### 2.6 Base local (requiere autorización)

La base `siset` del contenedor tiene la migración vieja y solo datos del seed. Se recrea con
`DROP DATABASE siset` + `CREATE DATABASE siset` dentro del contenedor (no se borra el volumen ni se
toca nada más). **Es destructivo para la base local de desarrollo**: se ejecuta solo con la autorización
explícita del responsable al aprobar este SDD. Otras máquinas, si existieran, harían lo mismo (se
documenta en el PR).

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                          | Cambio                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/api/prisma/schema/personas.prisma`                | **Nuevo** (§2.1).                                                               |
| `apps/api/prisma/schema/seguridad.prisma`               | `Rol` (`descripcion`, nombre 80) y `Usuario` reescrito (§2.1).                  |
| `apps/api/prisma/schema/catalogos.prisma`               | `Sede` con `direccion`, `activo` y back-relation; ids `Int`.                    |
| `apps/api/prisma/schema/auditoria.prisma`               | `LogAuditoria` según §2.1; comentario cambia a ADR-0003.                        |
| `apps/api/prisma/migrations/20261013151642_inicial/`    | **Se elimina.**                                                                 |
| `apps/api/prisma/migrations/<ts>_inicial/migration.sql` | **Nuevo**: generado + SQL de §2.2.                                              |
| `apps/api/prisma/semilla.ts`                            | §2.3.                                                                           |
| `apps/api/.env.example`                                 | Variables de §2.3.                                                              |
| `apps/api/test/semilla.test.ts`                         | Casos nuevos de `leerKardexInicial` (§4).                                       |
| `apps/api/test/bd/esquema.test.ts`                      | Reescrito para el modelo v1 (§4).                                               |
| `apps/api/test/bd/semilla.test.ts`                      | Conteos con `personas`; `debeCambiarPassword`, sede y username (§4).            |
| `apps/api/test/bd/drift.test.ts`                        | **Nuevo** (§4).                                                                 |
| `docs/adr/0003-bitacora-inmutable.md`                   | **Nuevo** (ADR corto, do-not-touch).                                            |
| `docs/sdd/S0.6/SDD.md`                                  | Estado → `Implementado (2026-10-13) · PR #2 · migración reemplazada por S0.11`. |

Commits en `feat/S0.11-modelo-datos-v1` (ya contiene el commit de adopción del modelo):

1. `S0.11 SDD y ADR-0003 de la bitácora`
2. `S0.11 esquema v1 con ids INTEGER y módulo personas`
3. `S0.11 migración inicial nueva con CHECK y bitácora de solo inserción`
4. `S0.11 seed y tests del modelo v1`

---

## 4 · Plan de tests

| Caso                                                                                                                                              | Nivel                | Cubre                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------ |
| Existen exactamente `especialidad`, `log_auditoria`, `persona`, `rol`, `sede`, `usuario`                                                          | BD                   | Alcance del ticket                                     |
| Todas las columnas `id` y `*_id` son `integer` (`information_schema`)                                                                             | BD                   | DEC-006 #2: ningún `BigInt`                            |
| Todas las FK son `RESTRICT/RESTRICT`                                                                                                              | BD                   | Convención (no hay excepciones CASCADE en este ticket) |
| Insertar dos personas con el mismo CI sin complemento falla; con complementos distintos funciona                                                  | BD                   | **E1**                                                 |
| Una persona sin ningún apellido falla                                                                                                             | BD                   | `ck_persona_apellido`                                  |
| `UPDATE`, `DELETE` y **`TRUNCATE`** sobre `log_auditoria` fallan con "solo inserción"                                                             | BD                   | **E2**, ADR-0003                                       |
| Insertar un registro de bitácora con `usuario_id` NULL e `ip` IPv6 funciona; con una `ip` inválida falla                                          | BD                   | Nullable + `INET`                                      |
| Borrar un rol con usuarios falla                                                                                                                  | BD                   | RESTRICT en la práctica                                |
| Zona horaria `America/La_Paz`                                                                                                                     | BD                   | Sin cambios respecto de S0.6                           |
| `prisma migrate diff` entre la base migrada y el esquema: **sin diferencias**                                                                     | BD (`drift.test.ts`) | Que el SQL a mano no genere drift                      |
| Seed dos veces → `{ roles: 6, sedes: 2, especialidades: 5, personas: 1, usuarios: 1 }`                                                            | BD                   | Idempotencia                                           |
| La segunda corrida no cambia `password_hash`; bcrypt costo 12 verificable                                                                         | BD                   | Sin cambios respecto de S0.6                           |
| Kardex: rol KARDEX, sede ANCOCAGUA, `debeCambiarPassword = true`, `username` = CI (y `CI-COMPL` con complemento)                                  | BD                   | §2.3–2.4                                               |
| `leerKardexInicial`: falta CI o contraseña, contraseña débil (sin mostrarla), sede inexistente, complemento de más de 5 caracteres, sin apellidos | unit                 | §2.3                                                   |
| Roles, sedes y especialidades iguales al prototipo                                                                                                | unit                 | Test existente, sin cambios                            |

**Deliberadamente sin test:** el `REVOKE` (es S6.4); los campos de bloqueo de `usuario` (su lógica es S1.1;
aquí solo existen).

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`, y ADR-0003 escrito
- [ ] Una sola migración inicial; la de S0.6 eliminada
- [ ] Ningún `BigInt` en `prisma/schema/` (test de `information_schema`)
- [ ] Tests de E1 y E2 en verde
- [ ] `migrate diff` sin drift
- [ ] Seed idempotente sobre la base local recreada
- [ ] Gate de la raíz y `npm run test:bd -w @siset/api` en verde
- [ ] PR a `main`; S0.11 en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                                                      | Gravedad | Mitigación                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma interpreta el SQL a mano (`CHECK`, triggers) como drift y propone borrarlo en la siguiente migración | Media    | Prisma 7 no introspecciona `CHECK` ni triggers. Lo confirma `drift.test.ts`; si fallara, se documenta el workaround en una v1.1 del SDD. |
| `@@index([... sort: Desc])` o `@db.Inet` se comportan distinto de lo esperado en Prisma 7                   | Baja     | `migrate diff` + tests de BD.                                                                                                            |
| Alguien con la base local vieja hace `migrate dev` y Prisma le pide `reset`                                 | Baja     | El PR documenta los pasos de recreación (§2.6).                                                                                          |
| Cambian las variables `SEED_KARDEX_*`: un `.env` local viejo falla                                          | Baja     | El error de `leerKardexInicial` nombra la variable; `.env.example` actualizado.                                                          |
| Back-relations entre módulos en el esquema                                                                  | Baja     | Comentario `///` en cada una; la regla de ADR-0001 rige el código, no el esquema.                                                        |

---

## 7 · Preguntas abiertas

_(Ninguna nueva.)_ El ticket aplica las propuestas provisionales de D-14, D-15, D-24, D-25 y D-26
(enlazadas en la hoja del cliente). Si alguna respuesta difiere, cambia el seed o una columna nullable,
no la estructura.
