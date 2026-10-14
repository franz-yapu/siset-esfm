# SDD — S2.1 · Tablas del file académico y catálogo de requisitos

- **Ticket:** ClickUp **S2.1** (`868mh1kxd`, https://app.clickup.com/t/868mh1kxd).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13) · v1.1 aprobada el mismo día
- **Versión:** 1.1 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/modelo-datos.md` §Convenciones, §catalogos (`requisito_tipo`, `tipo_tramite`, `tipo_tramite_requisito`), §files
  2. `docs/decisions/LOG.md` — DEC-006 (ids `INTEGER`, FK RESTRICT), DEC-009 (piloto: file básico; matrículas y resultado anual solo si llega D-07)
  3. `docs/product/dudas.md` D-04 (TACFI/TCLO: catálogo parametrizable), D-07 (notas, abierta), D-13, D-18 (requisitos: catálogo editable por Kardex), D-21 (tipos de trámite, abierta)
  4. `docs/adr/0001-monolito-modular.md` (un `.prisma` por módulo dueño)
  5. `docs/bd-tentaiva/siset_schema.sql` (tipos y tamaños de referencia)
  6. `docs/sdd/S0.11/SDD.md` §2.5 (migración con SQL a mano), `docs/sdd/S1.1/SDD.md` (`parametro`)
  7. `docs/do-not-touch.md` (motor de semáforo y bloqueo por UF)

---

## 1 · Alcance

### Entra

- Tabla `file_academico` y `requisito_file` (módulo **`files`**, nuevo esquema `files.prisma`).
- Tabla `requisito_tipo` (módulo `catalogos`).
- Enums `condicion_estudiante`, `estado_requisito` y `nivel_tclo`.
- `CHECK` del modelo como SQL en la migración.
- Seed del catálogo **provisional** de requisitos: TACFI, TCLO (con nivel) y certificado de notas, los mismos códigos del prototipo.

### No entra (a propósito)

- **`matricula` y `resultado_anual`** → **S2.3**, que espera D-07. El modelo los asigna a S2.1, pero el ticket y DEC-009 #3 los aíslan: su forma depende de cómo responda la escuela (¿nota por UF o resultado del año?).
- **`tipo_tramite` y `tipo_tramite_requisito`** → **S3.x**. Los tipos dependen de D-21 y de la respuesta nueva de D-05, que nombra trámites distintos de los del modelo (historial, legalización, certificado de notas y certificado de excelencia de años pasados). Crearlos ahora sería adivinar.
- Repositorios, servicios y API de files → S2.2. Semáforo y bloqueo por UF (`do-not-touch`) → S2.5–S2.6.
- La clave `MAX_UF_REPROBADAS` en `parametro` → S2.6, con D-07.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                   | Qué hay de verdad en el repo                                                                                                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Modelos del módulo `files` según `modelo-datos.md`" | ⚠️ El modelo pone en S2.1 también `matricula`, `resultado_anual`, `tipo_tramite` y `tipo_tramite_requisito`. El mismo ticket aparta matrícula y resultado anual (D-07). Los tipos de trámite también se apartan (D-21, D-05). Ver "No entra". |
| `resultado_anual`/matrícula "aislados para S2.3"     | ✅ No se crean. `file_academico` no depende de ellos: S2.3 solo agrega sus tablas con FK al file.                                                                                                                                             |
| "Seed del catálogo provisional (D-04, D-18)"         | ✅ El prototipo ya usa `TACFI`, `TCLO` y `CERT_NOTAS` (`apps/web/src/lib/reglas.ts`). Se siembran esos tres, y `catalogos-seed.test.ts` verifica que coincidan con la web.                                                                    |
| Hay un módulo `files`                                | ❌ No existe ni en `prisma/schema/` ni en `src/modulos/`. Se crea solo el esquema; el código llega en S2.2.                                                                                                                                   |
| `esquema.test.ts` sigue pasando                      | ❌ Fija 8 tablas y 5 FK. Se actualiza (§3).                                                                                                                                                                                                   |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket       | API pública        | Tablas propias que toca            |
| ----------- | ------------------------ | ------------------ | ---------------------------------- |
| `files`     | **nuevo** (solo esquema) | — (llega con S2.2) | `file_academico`, `requisito_file` |
| `catalogos` | dueño                    | sin cambios        | `requisito_tipo` (nueva)           |

### 2.1 Esquema

```prisma
// catalogos.prisma — se agrega
/// Catálogo parametrizable de requisitos: provisional hasta D-04 y D-18.
model RequisitoTipo {
  id            Int     @id @default(autoincrement())
  codigo        String  @unique @db.VarChar(30)   // TACFI, TCLO, CERT_NOTAS…
  nombre        String  @db.VarChar(120)
  descripcion   String? @db.VarChar(255)
  /// Cuenta para el semáforo del file.
  obligatorio   Boolean @default(true)
  /// TRUE para TCLO: el requisito del file lleva nivel.
  requiereNivel Boolean @default(false) @map("requiere_nivel")
  activo        Boolean @default(true)
  requisitosFile RequisitoFile[]   // back-relation (ADR-0001: no usar desde otro módulo)
  @@map("requisito_tipo")
}
```

```prisma
// files.prisma — NUEVO, módulo files
enum CondicionEstudiante { ESTUDIANTE EGRESADO  @@map("condicion_estudiante") }
enum EstadoRequisito     { PENDIENTE COMPLETO OBSERVADO  @@map("estado_requisito") }
enum NivelTclo           { BASICO INTERMEDIO AVANZADO  @@map("nivel_tclo") }

/// Expediente del estudiante o egresado que custodia Kardex.
model FileAcademico {
  id               Int                 @id @default(autoincrement())
  personaId        Int                 @unique @map("persona_id")
  /// Código que asigna la escuela (texto libre, único). El formato no se fija hasta conocerlo (D-13).
  codigoEstudiante String              @unique @map("codigo_estudiante") @db.VarChar(20)
  especialidadId   Int                 @map("especialidad_id")
  anioIngreso      Int                 @map("anio_ingreso") @db.SmallInt
  condicion        CondicionEstudiante @default(ESTUDIANTE)
  bloqueado        Boolean             @default(false)
  motivoBloqueo    String?             @map("motivo_bloqueo") @db.VarChar(255)
  activo           Boolean             @default(true)
  createdAt / updatedAt (TIMESTAMPTZ, como en usuario)
  persona / especialidad: relaciones RESTRICT/RESTRICT
  requisitos       RequisitoFile[]
  @@index([especialidadId])
  @@map("file_academico")
}

/// Estado de cada requisito del catálogo en un file.
model RequisitoFile {
  id              Int             @id @default(autoincrement())
  fileId          Int             @map("file_id")
  requisitoTipoId Int             @map("requisito_tipo_id")
  estado          EstadoRequisito @default(PENDIENTE)
  /// Fecha del documento o de su recepción física.
  fecha           DateTime?       @db.Date
  nroDocumento    String?         @map("nro_documento") @db.VarChar(40)
  nivel           NivelTclo?
  observacion     String?         @db.VarChar(255)
  registradoPor   Int?            @map("registrado_por")
  updatedAt       DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  file / requisitoTipo / usuario: relaciones RESTRICT/RESTRICT
  @@unique([fileId, requisitoTipoId])
  @@index([requisitoTipoId])
  @@map("requisito_file")
}
```

Más las back-relations que Prisma exige en `Persona`, `Especialidad` y `Usuario`, comentadas como "no usar desde otro módulo" (como `registrosAuditoria` en S0.11).

**Por qué así:**

- **Enums de PostgreSQL y no texto con `CHECK`:** son valores cerrados que no cambian (la condición, los tres estados de un requisito, los niveles del TCLO). Prisma los tipa en TypeScript. Los valores van en mayúsculas sin tilde (`BASICO`); la web los muestra con tilde.
- **`codigo_estudiante` libre:** el prototipo inventa `EST-2023-0041`, pero no sabemos si la escuela ya tiene un código propio. Se guarda tal cual (único) y la API (S2.2) solo lo normaliza a mayúsculas y sin espacios. Si D-13 trae un formato, se agrega un `CHECK` con una migración.
- **`requisito_file.registrado_por` nullable:** un requisito `PENDIENTE` recién creado no tiene responsable. El `CHECK` exige responsable y fecha solo cuando está `COMPLETO`.
- **Sin `created_at` en `requisito_file`:** como en el modelo. El historial de cambios lo da la bitácora (DEC-007): cada cambio de estado de un requisito será un evento `EDITAR` con su antes y después (S2.2).

### 2.2 SQL a mano en la migración

```sql
-- Ver docs/product/modelo-datos.md §files.
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_anio" CHECK ("anio_ingreso" BETWEEN 1990 AND 2100);
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_motivo"
  CHECK (NOT "bloqueado" OR ("motivo_bloqueo" IS NOT NULL AND btrim("motivo_bloqueo") <> ''));
ALTER TABLE "requisito_file" ADD CONSTRAINT "ck_requisito_completo"
  CHECK ("estado" <> 'COMPLETO' OR ("fecha" IS NOT NULL AND "registrado_por" IS NOT NULL));
```

El motivo vacío (`''`) también se rechaza: un bloqueo sin explicación no sirve para RF-07 CA3. El nivel del TCLO no se fuerza con un `CHECK`: depende de `requisito_tipo.requiere_nivel`, que está en otra tabla. Lo valida el servicio en S2.2.

### 2.3 Seed del catálogo provisional

En `prisma/semilla.ts`, junto a sedes y especialidades, con `upsert` por `codigo` y `update: {}`: si Kardex cambia un nombre más adelante, el seed no lo pisa.

| codigo       | nombre               | obligatorio | requiere_nivel |
| ------------ | -------------------- | ----------- | -------------- |
| `TACFI`      | TACFI                | sí          | no             |
| `TCLO`       | TCLO                 | sí          | **sí**         |
| `CERT_NOTAS` | Certificado de notas | sí          | no             |

Los nombres son los de `NOMBRE_REQUISITO` del prototipo. `descripcion` queda vacía a propósito: D-04 dice que cada sigla tiene tres significados distintos y no se inventa uno.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                               | Cambio                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `apps/api/prisma/schema/files.prisma`                        | **Nuevo** (§2.1).                                                                  |
| `apps/api/prisma/schema/catalogos.prisma`                    | + `RequisitoTipo`; back-relation en `Especialidad`.                                |
| `apps/api/prisma/schema/personas.prisma`, `seguridad.prisma` | Back-relations en `Persona` y `Usuario`.                                           |
| `apps/api/prisma/migrations/<fecha>_files/migration.sql`     | **Nuevo**: lo genera Prisma, más el SQL de §2.2.                                   |
| `apps/api/prisma/semilla.ts`                                 | + `REQUISITOS` y su `upsert`; `ResultadoSemilla` cuenta `requisitosTipo`.          |
| `apps/api/test/catalogos-seed.test.ts`                       | + los requisitos coinciden con `CODIGOS_REQUISITO` y `NOMBRE_REQUISITO` de la web. |
| `apps/api/test/bd/esquema.test.ts`                           | 11 tablas; las FK nuevas son RESTRICT.                                             |
| `apps/api/test/bd/files-esquema.test.ts`                     | **Nuevo** (§4).                                                                    |
| `apps/api/test/bd/semilla.test.ts`                           | El conteo incluye 3 requisitos; el seed no pisa un nombre editado.                 |

---

## 4 · Plan de tests

| Caso                                                                                                          | Nivel                  | Cubre                                 |
| ------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------- |
| La base tiene 11 tablas (las 8 de antes + `requisito_tipo`, `file_academico`, `requisito_file`) y los 3 enums | BD (`esquema.test.ts`) | Migración                             |
| Las FK nuevas son RESTRICT/RESTRICT; ningún id es BIGINT                                                      | BD                     | DEC-006                               |
| `persona_id` y `codigo_estudiante` únicos en `file_academico`                                                 | BD                     | Restricciones                         |
| `anio_ingreso` fuera de 1990–2100 se rechaza                                                                  | BD                     | `ck_file_anio`                        |
| `bloqueado = true` sin motivo, o con motivo vacío, se rechaza; con motivo se acepta                           | BD                     | `ck_file_motivo`                      |
| `requisito_file` `COMPLETO` sin fecha o sin responsable se rechaza; `PENDIENTE` sin ellos se acepta           | BD                     | `ck_requisito_completo`               |
| Un file no puede tener dos veces el mismo requisito                                                           | BD                     | `UNIQUE (file_id, requisito_tipo_id)` |
| No se puede borrar un `requisito_tipo` usado por un file ni una persona con file                              | BD                     | RESTRICT                              |
| `migrate diff` sin drift (test existente)                                                                     | BD                     | SQL a mano                            |
| El seed crea los 3 requisitos, es idempotente y no pisa un nombre editado                                     | BD                     | §2.3                                  |
| Los códigos y nombres de los requisitos coinciden con el prototipo                                            | Unit                   | §2.3                                  |

**Deliberadamente sin test:** la lógica del semáforo y del nivel del TCLO, que llegan con su servicio (S2.2, S2.5).

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S2.1/SDD.md`, Estado = Aprobado.
- [ ] Migración aplicada en la CI (`base-de-datos`) sin drift.
- [ ] Restricciones del modelo probadas (§4).
- [ ] Auditoría: no aplica (solo esquema y seed de catálogo); los eventos llegan con S2.2.
- [ ] DEC-016 en `LOG.md` (§7).
- [ ] Quality gate en verde.
- [ ] Commit `S2.1 …` en la rama `feat/S2.1-tablas-file`.

---

## 6 · Riesgos

| Riesgo                                                                    | Gravedad | Mitigación                                                                                                                               |
| ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| D-07 cambia la forma del file (por ejemplo, notas por UF dentro del file) | Baja     | Matrícula y resultado anual quedaron afuera a propósito; `file_academico` no tiene columnas de notas.                                    |
| D-04/D-18 traen otros requisitos o requisitos por año                     | Media    | `requisito_tipo` es un catálogo: agregar filas no cambia el esquema. "Por año" sería una columna nueva (`anio_desde`) con una migración. |
| El código de estudiante de la escuela no entra en 20 caracteres           | Baja     | Se amplía con una migración; el tipo es texto.                                                                                           |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna nueva. D-04, D-07, D-13, D-18 y D-21 ya están en la hoja.
- **DEC-016 (va a `LOG.md`):**
  1. S2.1 no crea `matricula`, `resultado_anual`, `tipo_tramite` ni `tipo_tramite_requisito`: esperan a D-07 (S2.3) y a D-21/D-05 (S3.x).
  2. Enums de PostgreSQL para condición, estado del requisito y nivel del TCLO.
  3. `codigo_estudiante` es texto libre y único hasta conocer el formato de la escuela.
  4. El catálogo provisional se siembra con los códigos del prototipo, sin descripción inventada.

---

## Changelog

- **1.1 (2026-10-13), por la respuesta de D-04 (DEC-018 #6):** el TACFI son 2 talleres artísticos (uno en 1.º y otro en 2.º) y el TCLO, el taller de lengua originaria, se defiende de 1.º a 3.º con niveles básico, intermedio y avanzado. El catálogo pasa a tener **una fila por requisito concreto**, con su año y su nivel:
  - `requisito_tipo` **gana** `anio_formacion` (1–5, nullable: un requisito que no es de un año, como el certificado de notas) y `nivel` (`nivel_tclo`, nullable), y **pierde** `requiere_nivel`.
  - `requisito_file` **pierde** `nivel`: el nivel es del requisito del catálogo, no de cada file.
  - `CHECK` nuevo: `anio_formacion BETWEEN 1 AND 5`.
  - Seed provisional (supone una defensa del TCLO por año; se repreguntó en D-04b): `TACFI_1` (1.º), `TACFI_2` (2.º), `TCLO_BASICO` (1.º), `TCLO_INTERMEDIO` (2.º), `TCLO_AVANZADO` (3.º) y `CERT_NOTAS` (sin año). Si son 3 defensas por año, se agregan filas sin cambiar el esquema. Lo mismo vale para los unos 30 requisitos que va a mandar la escuela (D-18).
  - `catalogos-seed.test.ts` deja de comparar los requisitos con el prototipo (`TACFI`, `TCLO`, `CERT_NOTAS`), que ya no coincide con lo que dijo la escuela. La web se alinea en S2.10.
  - El servicio de S2.2 ya no valida el nivel por file.
