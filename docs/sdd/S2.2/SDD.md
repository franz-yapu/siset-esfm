# SDD — S2.2 · API de files con paginación

- **Ticket:** ClickUp **S2.2** (`868mh1kxn`, https://app.clickup.com/t/868mh1kxn).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-04 (registro y búsqueda del file)
  2. `docs/decisions/LOG.md` — DEC-007 (evento con antes y después), DEC-009 (piloto: el personal carga files), DEC-015 (`files`: KARDEX crea, lee y edita; SEC_DIR, SEC_COORD y COORDINADOR leen; ESTUDIANTE `leer_propio`), DEC-016 (tablas del file, código libre y único), DEC-017 (paginación), DEC-019 (D-07b, D-13b, D-15), DEC-020 (patrón persona + cuenta en una transacción)
  3. `docs/product/dudas.md` D-13/D-13b (Kardex de Ancocagua carga los 152 files a mano), D-07b (bloqueo por permiso obligatorio), D-24 y D-15 (el personal y los estudiantes son de la UA Ancocagua)
  4. `docs/product/modelo-datos.md` §files, `docs/sdd/S2.1/SDD.md` v1.1, `docs/sdd/S1.8/SDD.md` (mismo patrón entre módulos)
  5. `apps/web/src/services/files.service.ts` y `apps/web/src/types/index.ts` (lo que usa hoy el prototipo en P-20/P-21)

---

## 1 · Alcance

### Entra

- Módulo nuevo **`files`** (`apps/api/src/modulos/files/`), dueño de `file_academico` (y más adelante de `requisito_file`).
- `/api/v1/files`: **crear** (persona del estudiante + file en una transacción), **ver uno**, **editar** (datos personales y académicos) y **listar** paginado con filtros.
- `GET /api/v1/catalogos/especialidades`: lista para el formulario y el filtro.
- Un evento en la bitácora por escritura, con antes y después (DEC-007).

### No entra (a propósito)

- **Bloqueo y desbloqueo**: D-07b lo define como una acción manual de Kardex por el permiso obligatorio de una gestión, hasta una resolución. Va con S2.3, que D-07b redefine. S2.2 crea los files desbloqueados y no deja editar `bloqueado`.
- **Requisitos, matrículas y resultado anual** → S2.4 y S2.3.
- **"Mi file"** (ESTUDIANTE `leer_propio`) → S2.7.
- **Cuenta del estudiante** al crear el file → S2.15 (doble verificación, DEC-018 #1, DEC-020 #1).
- **Pantallas conectadas** → S2.9 (búsqueda) y S2.10 (detalle y formulario).
- **Importación masiva**: D-13b dice que Kardex carga a mano; S2.8 deja de ser necesaria para el piloto.

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                                          | Qué hay de verdad en el repo                                                                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Existe un módulo de files"                                 | ❌ Solo están las tablas de S2.1. Módulo nuevo según ADR-0001.                                                                                                                              |
| "Crear la persona del estudiante + file en una transacción" | ✅ `personas` ya expone `buscarPersonaPorCi`, `crearPersona`, `actualizarPersona`, `buscarIdsPorNombre` y `obtenerPersonas` (S1.8). La raíz se los pasa a `files`, igual que a `seguridad`. |
| "CI duplicado → error claro"                                | ✅ `file_academico.persona_id` es único → 409 `FILE_EXISTENTE`. Si la persona existe sin file (por ejemplo, alguien del personal), se reutiliza sin cambiar sus datos (DEC-020 #6).         |
| "Buscar por especialidad"                                   | ⚠️ No hay endpoint de catálogos y la web necesita los ids. Se agrega `GET /catalogos/especialidades` (solo activas, orden por nombre).                                                      |
| "Permisos por rol" (`exigirSede`)                           | ⚠️ El file no tiene sede: todos los estudiantes son de Ancocagua (D-24, D-15). No se filtra por sede. Si entra la UA Corpa, el file necesitará la columna (ticket aparte).                  |
| Bloqueo (D-07b)                                             | ⚠️ Cambió con la respuesta de la escuela: va en S2.3.                                                                                                                                       |

---

## 2 · Diseño técnico

### Módulos (ADR-0001)

| Módulo      | Rol       | API pública que agrega (`index.ts`)                                              | Tablas propias que toca        |
| ----------- | --------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `files`     | dueño     | `crearModuloFiles`                                                               | `file_academico` (crea, edita) |
| `personas`  | consumido | (sin cambios: las funciones de S1.8; `fechaNacimiento` se suma a `DatosPersona`) | `persona` (crea, edita)        |
| `catalogos` | dueño     | `crearModuloCatalogos`, `existeEspecialidad`, `obtenerEspecialidades`            | `especialidad` (lee)           |
| `auditoria` | consumido | `registrarEvento`                                                                | `log_auditoria`                |

`files` no importa a `catalogos`: la raíz le pasa `existeEspecialidad` y `obtenerEspecialidades` (para el nombre en la respuesta), igual que las funciones de personas.

### 2.1 Rutas

| Método y ruta                   | Permiso          | Qué hace                                  | Evento   |
| ------------------------------- | ---------------- | ----------------------------------------- | -------- |
| `GET /files`                    | `files`/`leer`   | Lista paginada con filtros                | —        |
| `GET /files/:id`                | `files`/`leer`   | Uno                                       | —        |
| `POST /files`                   | `files`/`crear`  | Crea persona (o la reutiliza) + file; 201 | `CREAR`  |
| `PATCH /files/:id`              | `files`/`editar` | Edita datos personales y académicos       | `EDITAR` |
| `GET /catalogos/especialidades` | `files`/`leer`   | `[{ id, nombre }]` de las activas         | —        |

Las especialidades se protegen con `files`/`leer`: hoy solo las usan las pantallas de files, y la política no tiene un recurso de catálogos.

### 2.2 Contratos

**File en las respuestas** (`FileDetalle`):

```jsonc
{
  "id": 12,
  "codigo": "EST-2024-015",
  "ci": "7654321",
  "complemento": "",
  "nombres": "Juana",
  "apellidoPaterno": "Mamani",
  "apellidoMaterno": "Quispe",
  "nombre": "Juana Mamani Quispe",
  "fechaNacimiento": "2004-05-10", // o null
  "celular": null,
  "email": null,
  "especialidadId": 2,
  "especialidad": "Matemática",
  "anioIngreso": 2024,
  "condicion": "ESTUDIANTE", // ESTUDIANTE | EGRESADO
  "bloqueado": false,
  "motivoBloqueo": null,
}
```

**Crear** (`POST /files`): `ci`, `complemento`, `nombres`, `apellidoPaterno`, `apellidoMaterno`, `fechaNacimiento`, `celular`, `email` (mismas reglas que S1.8), más `codigo` (1–20, se recorta; obligatorio por DEC-016 #4, ver §7), `especialidadId`, `anioIngreso` (1990 hasta el año actual + 1; el `CHECK` de la tabla) y `condicion` (por defecto `ESTUDIANTE`). Responde 201 con `FileDetalle`.

**Editar** (`PATCH /files/:id`): los mismos campos salvo `ci` y `complemento` (no se editan: identidad de la persona, igual que DEC-020 #3), todos opcionales, al menos uno. `bloqueado` y `motivoBloqueo` no se aceptan (S2.3). Los datos personales van a `personas.actualizarPersona`; los académicos, a `file_academico`.

**Listar** (`GET /files`): `texto` (en CI, código y nombre, sin distinguir mayúsculas), `especialidadId`, `anioIngreso`, `condicion`, `bloqueado` (`true`/`false`), más `pagina`/`porPagina` (DEC-017). Orden: apellido paterno, materno y nombres (en memoria, como S1.8: son 152 files).

**Errores:**

| Caso                                                                                    | Respuesta                      |
| --------------------------------------------------------------------------------------- | ------------------------------ |
| La persona del CI ya tiene file                                                         | 409 `FILE_EXISTENTE`           |
| Código de estudiante repetido                                                           | 409 `CODIGO_EXISTENTE`         |
| `especialidadId` inexistente o inactiva                                                 | 422 `ESPECIALIDAD_INEXISTENTE` |
| File `:id` inexistente                                                                  | 404 `NO_ENCONTRADO`            |
| Validación (formato, año fuera de rango, sin apellidos, `ci` o `bloqueado` en el PATCH) | 400 `VALIDACION`               |

### 2.3 Transacción entre módulos (crear)

Dentro de `bd.$transaction`: (1) `personas.buscarPersonaPorCi(tx, ci, complemento)`; si tiene file → 409; si no existe → `personas.crearPersona(tx, …)`. (2) `existeEspecialidad(tx, id)` → 422 si no. (3) `file_academico.create`; un `P2002` sobre `codigo_estudiante` → 409 `CODIGO_EXISTENTE`. (4) `registrarEvento(tx, { accion: 'CREAR', modulo: 'FILES', entidad: 'file_academico', entidadId, despues })`. Si algo falla, no queda ni la persona, ni el file, ni el evento.

**Bitácora:** `EDITAR` guarda solo los campos que cambiaron (antes y después), con el módulo `FILES`. Una edición sin cambios reales responde 200 sin escribir ni registrar (como DEC-020 #5).

### 2.4 Por qué así

- **Mismo patrón que S1.8:** la persona es una sola aunque tenga cuenta y file; `files` no toca `persona` directo.
- **Orden en memoria:** el apellido vive en `personas`. Con 152 files (D-13) no hay problema; si crece, vista de lectura con ADR (igual que S1.8 §6).
- **Sin bloqueo en S2.2:** la regla de la escuela (D-07b) necesita su propio diseño (motivo, resolución, quién lo libera).

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                                                                                    | Cambio                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/api/src/modulos/files/{index,files.esquemas,files.rutas,files.controlador,files.servicio,files.modulo,file.repositorio}.ts` | **Nuevos** (§2).                                                                            |
| `apps/api/src/modulos/catalogos/{especialidad.repositorio,catalogos.modulo}.ts`, `index.ts`                                       | **Nuevos**: lista de especialidades, `existeEspecialidad`, `GET /catalogos/especialidades`. |
| `apps/api/src/modulos/personas/persona.repositorio.ts`                                                                            | `fechaNacimiento` en `DatosPersona` y en la selección.                                      |
| `apps/api/src/app.ts`                                                                                                             | Monta `files` y `catalogos` con sus dependencias.                                           |
| `apps/api/test/matriz-rutas.ts`                                                                                                   | Filas de las 5 rutas nuevas (el guardián de S1.14 lo exige).                                |
| `apps/api/test/bd/files.test.ts`                                                                                                  | **Nuevo** (§4).                                                                             |
| `docs/decisions/LOG.md`                                                                                                           | DEC-027 (§7).                                                                               |

---

## 4 · Plan de tests

| Caso                                                                                                                                         | Nivel          | Cubre    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- |
| Crear: 201, persona y file en la base, `CREAR` con Kardex como autor y el file en `despues`                                                  | BD + Supertest | RF-04    |
| CI con file → 409 `FILE_EXISTENTE`; CI de una persona sin file → se reutiliza sin tocar sus datos                                            | BD + Supertest | §2.3     |
| Código repetido → 409 `CODIGO_EXISTENTE` y no queda la persona nueva (transacción)                                                           | BD + Supertest | ADR-0001 |
| Especialidad inexistente → 422; validaciones (año fuera de rango, sin apellidos, CI con letras, `bloqueado` en el cuerpo) → 400              | BD + Supertest | §2.2     |
| Listar: `texto` por CI, código y nombre; `especialidadId`, `anioIngreso`, `condicion`, `bloqueado`; paginación y orden                       | BD + Supertest | §2.2     |
| Ver uno; inexistente → 404                                                                                                                   | BD + Supertest |          |
| Editar: solo cambia lo enviado (persona y file); `EDITAR` con antes y después; sin cambios → sin evento; con `ci` → 400                      | BD + Supertest | DEC-007  |
| Especialidades: solo activas, ordenadas                                                                                                      | BD + Supertest |          |
| Permisos: matriz HTTP de S1.14 con las rutas nuevas (SEC_DIR lee pero no crea ni edita; ESTUDIANTE y EGRESADO 403; sin token 401; `cpw` 403) | Supertest      | DEC-015  |
| OpenAPI documenta las 5 rutas (el guardián de S1.14)                                                                                         | Supertest      | DEC-025  |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S2.2/SDD.md`, Estado = Aprobado.
- [ ] Tests de búsqueda, paginación, permisos y eventos (§4), y la matriz HTTP con las rutas nuevas.
- [ ] Toda escritura registra su evento en la misma transacción (DEC-007).
- [ ] DEC-027 en `LOG.md`.
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commit `S2.2 …` en `feat/S2.2-api-files`.

---

## 6 · Riesgos

| Riesgo                                                         | Gravedad | Mitigación                                                                          |
| -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| No todos los estudiantes tienen código asignado (§7)           | Media    | Pregunta a la escuela. Si no lo tienen, se vuelve opcional con una migración chica. |
| Kardex carga dos veces a la misma persona con otro complemento | Baja     | El CI con complemento es la identidad (E1); la búsqueda por CI muestra los dos.     |
| Llega la UA Corpa y el file necesita sede                      | Baja     | Ticket aparte con migración; hoy todo es Ancocagua (D-24, D-15).                    |

---

## 7 · Preguntas abiertas

- **Para la escuela (no bloquea):** ¿todos los estudiantes tienen un **código de estudiante** asignado por la escuela? Mientras tanto, se mantiene obligatorio (DEC-016 #4). Si no lo tienen, se vuelve opcional con una migración chica.
- **DEC-027 (va a `LOG.md`):**
  1. Módulo `files` con `/api/v1/files` (crear, ver, editar, listar paginado). La persona se crea o se reutiliza en la misma transacción (patrón de DEC-020).
  2. Bloqueo, requisitos, matrículas, "mi file" y la cuenta del estudiante quedan fuera (S2.3, S2.4, S2.7, S2.15). El bloqueo sigue D-07b y va en S2.3.
  3. El file no tiene sede: todos son de Ancocagua. No se aplica `exigirSede`.
  4. `GET /catalogos/especialidades` con permiso `files`/`leer`.
