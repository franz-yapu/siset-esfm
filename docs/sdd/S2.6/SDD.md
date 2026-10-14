# SDD — S2.6 · Bloqueo del file por permiso obligatorio (D-07b)

- **Ticket:** S2.6, redefinido por la respuesta D-07b (el backlog decía "Bloqueo por UF reprobadas sobre el límite"). Se crea en ClickUp al aprobar este SDD.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/product/dudas.md` D-07 y **D-07b** (respondida el 2026-10-14): "si un estudiante reprueba ya no es necesario que retome TACFI ni TCLO… el detalle está cuando al estudiante le otorgan el **permiso obligatorio por una gestión** por reprobación o por no existir la especialidad para su reincorporación; en ese caso **debe bloquearse al estudiante hasta que haya una resolución** que determine su situación".
  2. `docs/decisions/LOG.md` — DEC-007 (evento con antes y después), DEC-015 (`files`/`editar`: KARDEX), DEC-019 #4 (el bloqueo lo causa el permiso obligatorio, no reprobar), DEC-027 #2 (el bloqueo quedó fuera de S2.2), DEC-028 #2
  3. `docs/product/PRD.md` RF-07 CA2 y `docs/product/business-rules.md` §File académico (dicen todavía "UF reprobadas > límite → bloqueado")
  4. `docs/sdd/S2.2/SDD.md`, `docs/sdd/S2.9-S2.10/SDD.md`; ADR-0003 (la lista de acciones de la bitácora se amplía con un PR)

---

## 1 · Alcance

### Entra

- `POST /api/v1/files/:id/bloqueo` (con motivo) y `POST /api/v1/files/:id/desbloqueo` (con la resolución), solo KARDEX.
- Acciones de bitácora nuevas `BLOQUEAR` y `DESBLOQUEAR`, con antes y después.
- P-41: botón "Bloquear" / "Desbloquear" con su modal, contra la API, en los dos modos; reemplaza el `BotonBloqueoDemo`.
- Corregir RF-07 CA2 del PRD y `business-rules.md` según D-07b.

### No entra (a propósito)

- **Matrículas por año** (lo que quedaba de S2.3): la escuela no dijo si Kardex las registra. Queda pendiente (§7).
- **Resultados anuales y bloqueo automático por UF**: D-07 y D-07b los descartan. El viejo S2.3 se cierra como "no aplica".
- **Efectos del bloqueo en trámites** (no ingresar, dictaminar ni emitir, `business-rules.md`): esos módulos no existen todavía; los aplican S3.x, S4.x y S5.x leyendo `bloqueado`.

### Premisas verificadas (de `task-brief`)

| Premisa                                     | Qué hay de verdad                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Bloqueo por UF reprobadas sobre el límite" | ❌ D-07b: lo decide Kardex por el permiso obligatorio; dura hasta una resolución. Kardex no registra notas (D-07).                                  |
| Tabla                                       | ✅ `file_academico.bloqueado` y `motivo_bloqueo`, con `CHECK` (bloqueado ⇒ motivo). Sin migración: la resolución queda en el evento de la bitácora. |
| Bitácora                                    | ⚠️ No hay acciones de bloqueo de file (`BLOQUEO_CUENTA` es de usuarios). Se agregan `BLOQUEAR` y `DESBLOQUEAR`.                                     |
| Web                                         | ⚠️ El botón solo existe en la demo y lee el prototipo. Pasa a `filesService` en los dos modos.                                                      |

---

## 2 · Diseño técnico

### 2.1 API

| Ruta                         | Permiso          | Cuerpo                                                                      | Evento        |
| ---------------------------- | ---------------- | --------------------------------------------------------------------------- | ------------- |
| `POST /files/:id/bloqueo`    | `files`/`editar` | `{ "motivo": "Permiso obligatorio por reprobación, gestión 2026" }` (5–255) | `BLOQUEAR`    |
| `POST /files/:id/desbloqueo` | `files`/`editar` | `{ "resolucion": "RA-045/2026" }` (1–100)                                   | `DESBLOQUEAR` |

Responden 200 con el `FileDetalle`. Errores: 404 `NO_ENCONTRADO`; 422 `ESTADO_SIN_CAMBIO` si ya estaba bloqueado (o desbloqueado); 400 `VALIDACION`.

- **Bloquear:** `bloqueado = true`, `motivo_bloqueo = motivo`. Evento `BLOQUEAR`: antes `{ bloqueado: false }`, después `{ bloqueado: true, motivo }`.
- **Desbloquear:** `bloqueado = false`, `motivo_bloqueo = null`. Evento `DESBLOQUEAR`: antes `{ bloqueado: true, motivo }`, después `{ bloqueado: false, resolucion }`. La resolución no se guarda en el file: el historial del file es la bitácora (DEC-007), y así no hace falta migración.
- El motivo es **texto libre**: D-07b nombra dos casos (reprobación y especialidad inexistente) pero no dice que sean los únicos. La web ofrece esos dos como atajos.
- Las dos operaciones van en una transacción con su evento, como S2.2.

### 2.2 Web (P-41)

- `filesService.bloquear(id, motivo)` y `desbloquear(id, resolucion)`, en `files.api` y `files.mock` (el mock escribe el mismo almacén y registra en la bitácora de la demo).
- Botón en la cabecera, solo con `editar-file`: "Bloquear" abre un modal con el motivo (dos atajos: "Permiso obligatorio por reprobación" y "Permiso obligatorio: no existe la especialidad para su reincorporación", más texto libre); "Desbloquear" pide el número de resolución. Los errores van al campo, como en el formulario.
- La cabecera ya muestra el bloqueo con su motivo (S2.10). El aviso de "próxima versión" de P-41 deja de mencionar el bloqueo.
- `BotonBloqueoDemo` y `filesPrototipoService.cambiarBloqueo` se borran; `ModalBloqueo` se adapta a los dos modales.

### 2.3 Documentos

- PRD RF-07 CA2 y `business-rules.md` §File: "el file queda BLOQUEADO cuando Kardex registra el permiso obligatorio por una gestión (D-07b); se desbloquea con el número de la resolución, que queda en la bitácora". Se quita el límite de UF.

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                                                                        | Cambio                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `apps/api/src/modulos/auditoria/auditoria.esquemas.ts`                                                                                         | + `BLOQUEAR`, `DESBLOQUEAR`.                        |
| `apps/api/src/modulos/files/{files.esquemas,files.servicio,files.controlador,files.rutas,file.repositorio}.ts`                                 | Las dos rutas (§2.1).                               |
| `apps/api/test/matriz-rutas.ts`, `test/bd/files-bloqueo.test.ts`                                                                               | Filas de la matriz y tests (§4).                    |
| `apps/web/src/config/auditoria.ts` (+ su test de sincronía)                                                                                    | Etiquetas de `BLOQUEAR` y `DESBLOQUEAR`.            |
| `apps/web/src/services/files.{service,api,mock}.ts` (+ tests)                                                                                  | `bloquear`, `desbloquear`.                          |
| `apps/web/src/pages/kardex/DetalleFile.tsx`, `components/file/ModalesFile.tsx`, `SeccionesDemoFile.tsx`, `services/files-prototipo.service.ts` | Botón y modales conectados; se borra lo de la demo. |
| `docs/product/PRD.md`, `docs/product/business-rules.md`, `docs/decisions/LOG.md`                                                               | §2.3 y DEC-029.                                     |

---

## 4 · Plan de tests

| Caso                                                                                                                           | Nivel          |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| Bloquear: 200, `bloqueado` y motivo en el file, `BLOQUEAR` con antes y después a nombre de Kardex                              | BD + Supertest |
| Desbloquear: 200, sin motivo, `DESBLOQUEAR` con la resolución en `despues`                                                     | BD + Supertest |
| Bloquear uno bloqueado o desbloquear uno libre → 422 `ESTADO_SIN_CAMBIO`; sin motivo o sin resolución → 400; inexistente → 404 | BD + Supertest |
| Permisos: matriz HTTP con las dos rutas (solo KARDEX)                                                                          | Supertest      |
| `files.mock`: mismo contrato y errores; `files.api`: rutas y cuerpos                                                           | Unit           |
| Demo: Kardex bloquea con el atajo de reprobación, ve el aviso en la cabecera y en la búsqueda, y desbloquea con la resolución  | E2E            |
| API real (E12): Kardex bloquea y desbloquea; el historial muestra los dos eventos                                              | E2E            |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S2.6/SDD.md`, Estado = Aprobado; ticket S2.6 en ClickUp.
- [ ] Rutas, eventos y botón conectados; demo y API con el mismo comportamiento.
- [ ] PRD y `business-rules.md` corregidos según D-07b; DEC-029.
- [ ] Tests del §4 y quality gate en verde.
- [ ] Commit `S2.6 …` en `feat/S2.6-bloqueo-file`.

---

## 6 · Riesgos

| Riesgo                                                                 | Gravedad | Mitigación                                             |
| ---------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| Hay otros casos de bloqueo que la escuela no nombró                    | Baja     | El motivo es texto libre; D-29 lo pregunta.            |
| La resolución tiene un formato oficial (número, fecha, quién la emite) | Baja     | Texto libre de hasta 100 caracteres; D-29 lo pregunta. |

---

## 7 · Preguntas abiertas

- **Para la escuela (D-29, a la hoja):** ¿qué datos de la **resolución** se anotan al desbloquear (número, fecha, quién la firma)? ¿Hay otros casos, además del permiso obligatorio, en que se bloquea a un estudiante? Mientras tanto: número de resolución en texto libre y motivo libre.
- **Para la escuela (D-30, a la hoja):** ¿Kardex registra en el file la **matrícula** de cada año (gestión y estado)? Mientras tanto, las matrículas no entran (resto del viejo S2.3).
- **DEC-029 (va a `LOG.md`):**
  1. El file se bloquea y desbloquea a mano por Kardex: bloqueo con motivo (permiso obligatorio, D-07b), desbloqueo con el número de la resolución. Sin bloqueo automático por UF. Se corrigen RF-07 CA2 y `business-rules.md`.
  2. La resolución queda en la bitácora (`DESBLOQUEAR`), no en el file: sin migración.
  3. Acciones nuevas `BLOQUEAR` y `DESBLOQUEAR`.
  4. El viejo S2.3 (resultados anuales) no aplica; las matrículas esperan D-30.
