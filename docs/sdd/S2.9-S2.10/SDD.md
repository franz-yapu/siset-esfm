# SDD — S2.9 y S2.10 · Búsqueda, detalle y formulario de files conectados

- **Tickets:** ClickUp **S2.9** (`868mh1kxz`, https://app.clickup.com/t/868mh1kxz) y **S2.10** (`868mh1ky6`, https://app.clickup.com/t/868mh1ky6). Comparten diseño (el servicio de files), por eso van en un solo SDD.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-14)
- **Versión:** 1.1 · **Fecha:** 2026-10-14
  - 1.1 (al implementar): P-41 no suma un botón "Editar": la pestaña de datos se edita en el lugar, como en el
    prototipo, y P-42 se usa para el alta (la ruta `/files/:id/editar` sigue). Lo que solo existe en la demo pasa
    a `components/file/SeccionesDemoFile.tsx`. `CabeceraFile` recibe los datos ya armados (también la usan
    "mi file" y el dictamen). Un solo commit para los dos tickets.
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-04; `docs/product/prototipo-pantallas.md` P-40 (búsqueda), P-41 (detalle), P-42 (nuevo/editar)
  2. `docs/decisions/LOG.md` — DEC-017 (paginación), DEC-021 (sesión), DEC-022 (permisos de la web), DEC-023 (el mock imita el contrato de la API; TanStack Query; errores por campo), DEC-027 (API de files)
  3. `docs/product/dudas.md` D-04/D-04b y D-18 (requisitos), D-07b (bloqueo), D-13b (carga manual), D-28 (código de estudiante)
  4. `docs/sdd/S2.2/SDD.md` (contrato), `docs/sdd/S1.13/SDD.md` (mismo patrón en la web)

---

## 1 · Alcance

### Entra

- **S2.9 (P-40):** búsqueda de files contra `GET /files`, con filtros, paginación en el servidor y orden por apellido.
- **S2.10 (P-41 y P-42):** detalle (datos personales y académicos) y formulario de alta y edición contra `GET/POST/PATCH /files`, con la especialidad del catálogo.
- Un servicio de files **con el contrato de la API** en los dos modos (`files.api.ts` y `files.mock.ts`), como DEC-023.

### No entra (a propósito)

- **Requisitos, matrículas, resultados anuales y bloqueo** (S2.3, S2.4; D-04, D-07b, D-18): en modo API esas secciones del detalle **se ocultan** con un aviso; en la demo siguen como en el prototipo.
- **Semáforo** (S2.5): en modo API la columna y el filtro se ocultan; en la demo siguen.
- **Cuenta del estudiante al crear el file** (casilla del prototipo): llega con S2.15. Se quita del formulario en los dos modos.
- **Las otras 10 pantallas** que leen files (revisión, emisión, hojas de ruta, dictamen, mi file, inicios): siguen con el servicio del prototipo hasta su ticket.

### Premisas verificadas (de `task-brief`)

| Premisa del ticket                      | Qué hay de verdad en el repo                                                                                                                                                                                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "`files.service.ts` con la API de S2.2" | ⚠️ `filesService` lo usan **13 pantallas**, no solo P-40/P-41/P-42, y con el modelo del prototipo (`matriculas`, `requisitos`, `resultados`, semáforo, `cambiarBloqueo`, `importar`, `miFile`, `buscarPorCi`), que la API no tiene. Conectar el servicio entero rompe esas pantallas. **Se parte en dos** (§2.1). |
| "Filtros" de P-40                       | ⚠️ El prototipo filtra por **año de formación** (de la última matrícula) y por semáforo. La API filtra por **año de ingreso**, especialidad, condición y bloqueo. Se usan los de la API; el semáforo queda solo en la demo.                                                                                       |
| P-42 "crear cuenta"                     | ⚠️ El formulario ofrece crear la cuenta del estudiante; la API no lo hace (DEC-027 #2). Se quita.                                                                                                                                                                                                                 |
| Nombres y apellidos                     | ⚠️ El prototipo tiene `apellidos` en un solo campo; la API, paterno y materno (al menos uno).                                                                                                                                                                                                                     |

---

## 2 · Diseño técnico

### 2.1 Dos servicios mientras dura la migración

| Servicio                                                                     | Contrato                                                                     | Lo usan                                                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `files.service.ts` → `files.api.ts` / `files.mock.ts` (nuevo)                | El de la API (DEC-027): `FileDetalle`, `Pagina<FileDetalle>`, especialidades | P-40, P-41, P-42                                                               |
| `files-prototipo.service.ts` (`filesPrototipoService`, el de hoy renombrado) | El del prototipo, sin cambios                                                | Las otras 10 pantallas; en la demo, las pestañas de requisitos y otras de P-41 |

- `files.mock.ts` **lee y escribe el mismo almacén** del prototipo (`db.files`) y lo traduce al contrato de la API (apellidos partidos, especialidad por id, `codigo`, errores con los mismos códigos: `FILE_EXISTENTE`, `CODIGO_EXISTENTE`, `ESPECIALIDAD_INEXISTENTE`, `VALIDACION`). Así, en la demo, un file creado en P-42 aparece en las demás pantallas.
- Cada pantalla del prototipo se pasa al servicio nuevo en su ticket (S2.3, S2.4, S2.7, S3.x…), y `files-prototipo` desaparece cuando ya no lo use nadie.

### 2.2 Tipos y hooks

- `types/files.ts`: `FileDetalle`, `DatosCrearFile`, `CambiosFile`, `FiltrosFiles`, `Especialidad` (el contrato de S2.2).
- `hooks/useFiles.ts` (TanStack Query, como S1.13): `['files', filtros]` con la página anterior visible mientras carga la siguiente; `['file', id]`; `['especialidades']` (dura toda la sesión); mutaciones de crear y editar que invalidan `files` y `file`.

### 2.3 P-40 · Búsqueda (S2.9)

- Filtros: texto (CI, código o nombre; espera de 300 ms), especialidad (del catálogo), año de ingreso, condición y "solo bloqueados". Van en la URL, para volver atrás sin perderlos.
- Columnas: CI, nombre completo, código, especialidad, año de ingreso (o "Egresado"), bloqueado. El semáforo, solo en la demo (`todoMock()`).
- Paginación en el servidor, 20 por página, con el `Paginacion` compartido.
- "Nuevo file" solo con el permiso `nuevo-file` (S1.11).

### 2.4 P-41 · Detalle (S2.10)

- Cabecera y pestaña **Datos personales** con `FileDetalle`: datos personales, código, especialidad, año, condición y el estado de bloqueo con su motivo, de solo lectura.
- **Historial**: `GET /auditoria?entidad=file_academico&entidadId=…`, solo para KARDEX (el único que lee la bitácora). Para el resto, la pestaña no aparece.
- **Matrículas, resultados, requisitos y trámites**: en modo API, un aviso dice que esas secciones llegan con S2.3 y S2.4 (D-04, D-07b, D-18). En la demo se muestran como hoy, leyendo `filesPrototipoService`.
- "Editar" solo con el permiso `editar-file` (S1.11).

### 2.5 P-42 · Formulario (S2.10)

- Campos: nombres, apellido paterno, apellido materno, CI y complemento (deshabilitados al editar: el CI no se edita, DEC-027 #1), fecha de nacimiento, celular, correo, código de estudiante (obligatorio hasta D-28), especialidad (select del catálogo), año de ingreso y condición.
- Validación local con los mismos mensajes que la API; los errores `VALIDACION` de la API van debajo de cada campo (`detalles[].ruta`, como S1.13). `FILE_EXISTENTE` va debajo del CI; `CODIGO_EXISTENTE`, debajo del código; `ESPECIALIDAD_INEXISTENTE`, debajo de la especialidad. La utilidad de S1.13 (`erroresDelFormulario`) se generaliza a `lib/formularios.ts` y la reusan los dos.
- Editar manda **solo los campos que cambiaron**; si no cambió nada, vuelve al detalle con "Sin cambios", sin llamar a la API.

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                                                                                                               | Cambio                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/services/files-prototipo.service.ts`                                                                                                                                    | **Renombrado** desde `files.service.ts`, sin cambios de lógica.    |
| 10 pantallas que lo usan (`Revision`, `Emision`, `CargaMasiva`, `InicioKardex`, `InicioEstudiante`, `InicioEgresado`, `NuevaHojaRuta`, `DetalleHojaRuta`, `MiFile`, `EmitirDictamen`) | Solo el import.                                                    |
| `apps/web/src/services/files.{service,api,mock}.ts`                                                                                                                                   | **Nuevos** (§2.1).                                                 |
| `apps/web/src/types/files.ts`, `hooks/useFiles.ts`                                                                                                                                    | **Nuevos** (§2.2).                                                 |
| `apps/web/src/lib/formularios.ts`, `lib/files.ts`                                                                                                                                     | Errores por campo (desde `lib/usuarios.ts`) y validación del file. |
| `apps/web/src/pages/kardex/{Files,DetalleFile,FormFile}.tsx`, `components/file/FormDatosFile.tsx`                                                                                     | Conectados (§2.3–2.5).                                             |
| Tests: `services/files.{api,mock}.test.ts`, `lib/files.test.ts`, `e2e/files.spec.ts`, `e2e/modo-api-files.spec.ts`, `e2e/api-real/files.spec.ts`                                      | **Nuevos** (§4).                                                   |
| `apps/web/playwright.config.ts`                                                                                                                                                       | `files` en `VITE_USAR_API` del proyecto `api` y de `api-real`.     |
| `docs/decisions/LOG.md`                                                                                                                                                               | DEC-028 (§7).                                                      |

---

## 4 · Plan de tests

| Caso                                                                                                                                        | Nivel | Cubre          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------------- |
| `files.api`: cada función llama a la ruta correcta con los parámetros y traduce los errores                                                 | Unit  | §2.1           |
| `files.mock`: contrato igual al de la API (paginación, orden por apellido, filtros, códigos de error, reutiliza el almacén del prototipo)   | Unit  | DEC-023        |
| `lib/files`: validación local con los mismos mensajes que la API; solo los campos que cambiaron                                             | Unit  | §2.5           |
| Demo: Kardex crea un file, lo encuentra en P-40 por CI y por nombre, lo edita y ve el cambio; el file aparece en una pantalla del prototipo | E2E   | §2.1           |
| Modo API (`page.route`): P-40 manda los filtros y la página a `GET /files`; P-42 muestra `CODIGO_EXISTENTE` debajo del código               | E2E   | §2.3, §2.5     |
| API real (E11): Kardex crea un file, lo busca, lo edita y lo ve en la bitácora; SEC_DIR lo ve pero no tiene "Editar"                        | E2E   | RF-04, DEC-015 |
| Las otras pantallas del prototipo siguen funcionando (`recorrido.spec.ts`)                                                                  | E2E   | §2.1           |

---

## 5 · Definition of Done

- [x] SDD en `docs/sdd/S2.9-S2.10/SDD.md`, Estado = Aprobado.
- [x] P-40, P-41 y P-42 contra la API; demo intacta.
- [x] Secciones de requisitos, matrículas, resultados, bloqueo y semáforo ocultas en modo API, con aviso.
- [x] Tests del §4 en verde; quality gate en verde.
- [x] DEC-028 en `LOG.md`.
- [x] Commit `S2.9 y S2.10 …` en `feat/S2.9-S2.10-files-conectados` (uno solo: los dos tickets tocan los mismos archivos).

---

## 6 · Riesgos

| Riesgo                                                                                | Gravedad | Mitigación                                                                                                |
| ------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| En modo API, las otras pantallas siguen leyendo files del prototipo (datos distintos) | Media    | En el piloto solo se usan P-40/P-41/P-42 (DEC-009); las demás se conectan en su ticket. Se dice en el PR. |
| Dos servicios de files confunden                                                      | Baja     | Nombres explícitos (`files-prototipo`), comentario de cabecera y la tabla de §2.1.                        |
| Kardex carga datos que después cambian de forma (D-28, código)                        | Baja     | El código es texto libre; si se vuelve opcional, el formulario solo deja de exigirlo.                     |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna nueva (D-28 ya está en la hoja).
- **DEC-028 (va a `LOG.md`):**
  1. El servicio de files se parte: `files.service` con el contrato de la API (P-40, P-41, P-42) y `files-prototipo.service` para el resto hasta su ticket.
  2. En modo API, P-41 oculta requisitos, matrículas, resultados y trámites con un aviso, y P-40 oculta el semáforo; en la demo siguen.
  3. La cuenta del estudiante deja de crearse desde el formulario del file (llega con S2.15).
  4. Errores por campo con una utilidad común (`lib/formularios.ts`) para usuarios y files.
