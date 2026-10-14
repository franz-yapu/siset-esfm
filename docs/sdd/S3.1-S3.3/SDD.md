# SDD — S3.1 y S3.3 · Tablas de hojas de ruta y máquina de estados (dos flujos)

- **Tickets:** S3.1 ("Tablas hoja_ruta, movimiento_hoja_ruta + enum de estados") y S3.3 ("Servicio de máquina de estados"), rehechos por DEC-033. Comparten diseño: un solo SDD. Se crean en ClickUp al aprobarlo.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/planning/2026-10-14 - Brief-modulo-hojas-ruta.md` y **DEC-033** (dos flujos según el valorado; sin dictamen; pases y observación en espera)
  2. `docs/product/dudas.md` D-05, D-08, D-09, D-11, D-15, D-21 (respondidas); D-32 a D-35 (abiertas, con propuesta)
  3. `docs/product/modelo-datos.md` §hojas de ruta (DEC-006: trigger que copia el estado, movimientos de solo inserción), `docs/adr/0003-bitacora-inmutable.md` (`fn_solo_insercion` reutilizable)
  4. `docs/do-not-touch.md` (máquina de estados: ADR + `business-rules.md` + pruebas de transiciones), ADR-0001, ADR-0002, DEC-015, DEC-029 (bloqueo)

---

## 1 · Alcance

### Entra

- **Tablas:** `tipo_tramite` (catálogo con los 4 tipos y `requiere_valorado`), `hoja_ruta`, `movimiento_hoja_ruta` (solo inserción) y el enum `estado_hoja_ruta`.
- **Máquina de estados** pura (tabla de transiciones por flujo, rol y sede) y el servicio que la aplica con `SELECT … FOR UPDATE`, un movimiento y un evento en la bitácora en la misma transacción.
- `POST /api/v1/hojas-ruta/:nro/transiciones` y `GET /api/v1/hojas-ruta/:nro` (detalle con movimientos y las acciones posibles para quien pregunta).
- **ADR-0005** (máquina de estados, `do-not-touch.md`) y `business-rules.md` §Hojas de ruta reescrito.

### No entra (a propósito)

- **Crear** la hoja de ruta (ingesta) y el **correlativo**: S3.4 y S3.2. Aquí los tests insertan hojas de ruta directo en la base.
- Lista, formulario, QR, carátula y seguimiento público: S3.5, S3.8, S3.9, S4.1–S4.3.
- **Observado, pases y revisión de Kardex**: esperan D-34 y D-35 (DEC-033 #3). Las tablas `pase` y `dictamen` del modelo **no se crean**; `hoja_ruta.enviado_dictamen_en` tampoco (no hay dictamen, D-11).
- Requisitos por tipo de trámite (`tipo_tramite_requisito`): la escuela no dio la lista (D-21).

### Premisas verificadas (de `task-brief`)

| Premisa            | Qué hay de verdad                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tablas del modelo  | ⚠️ Diseñadas en `modelo-datos.md`, no creadas; con restos del flujo viejo (`enviado_dictamen_en`, `pase`, `dictamen`), que se quitan del modelo. |
| Máquina de estados | ⚠️ Solo en el prototipo (11 estados). `do-not-touch.md` exige ADR, `business-rules.md` y pruebas.                                                |
| Permisos           | ⚠️ DEC-015 es gruesa (`hojas-ruta`: SEC_DIR crea; KARDEX edita; resto lee). Quién hace cada paso va en la tabla de transiciones (ADR-0002).      |
| Sedes              | ✅ LA_PAZ (= ESFM Calahumana, D-15) y ANCOCAGUA.                                                                                                 |

---

## 2 · Diseño técnico

### 2.1 Tipos de trámite (catálogo, módulo `catalogos`)

| `codigo`                   | `nombre`                                  | `requiere_valorado` |
| -------------------------- | ----------------------------------------- | ------------------- |
| `HISTORIAL_ACADEMICO`      | Historial académico                       | sí                  |
| `LEGALIZACION_HISTORIAL`   | Legalización de historial académico       | sí                  |
| `CERT_NOTAS_ANTERIOR`      | Certificado de notas de años pasados      | no                  |
| `CERT_EXCELENCIA_ANTERIOR` | Certificado de excelencia de años pasados | no                  |

Se siembran en la migración (como `parametro`). `activo` permite agregar o retirar tipos sin cambiar el esquema.

### 2.2 Estados y transiciones

Enum `estado_hoja_ruta`: `RECIBIDO`, `AVISADO_KARDEX`, `EN_IMPRESION`, `IMPRESO`, `FIRMADO_DIR_ACADEMICA`, `FIRMADO_COORDINADOR`, `REMITIDO_CALAHUMANA`, `LISTO`, `ENTREGADO`.

| Acción                | Desde                   | Hacia                   | Flujo        | Rol         | Sede del usuario | Bloqueo del file |
| --------------------- | ----------------------- | ----------------------- | ------------ | ----------- | ---------------- | ---------------- |
| (ingesta, S3.4)       | —                       | `RECIBIDO`              | los dos      | SEC_DIR     | LA_PAZ           | impide           |
| `AVISAR_KARDEX`       | `RECIBIDO`              | `AVISADO_KARDEX`        | los dos      | SEC_DIR     | LA_PAZ           | impide           |
| `RECOGER`             | `AVISADO_KARDEX`        | `EN_IMPRESION`          | los dos      | KARDEX      | ANCOCAGUA        | impide           |
| `IMPRIMIR`            | `EN_IMPRESION`          | `IMPRESO`               | los dos      | KARDEX      | ANCOCAGUA        | impide           |
| `FIRMA_DIR_ACADEMICA` | `IMPRESO`               | `FIRMADO_DIR_ACADEMICA` | con valorado | SEC_DIR     | LA_PAZ           | —                |
| `FIRMA_DIR_GENERAL`   | `FIRMADO_DIR_ACADEMICA` | `LISTO`                 | con valorado | SEC_DIR     | LA_PAZ           | —                |
| `FIRMA_COORDINADOR`   | `IMPRESO`               | `FIRMADO_COORDINADOR`   | sin valorado | COORDINADOR | ANCOCAGUA        | —                |
| `REMITIR`             | `FIRMADO_COORDINADOR`   | `REMITIDO_CALAHUMANA`   | sin valorado | KARDEX      | ANCOCAGUA        | —                |
| `RECIBIR_CALAHUMANA`  | `REMITIDO_CALAHUMANA`   | `LISTO`                 | sin valorado | SEC_DIR     | LA_PAZ           | —                |
| `ENTREGAR`            | `LISTO`                 | `ENTREGADO`             | los dos      | SEC_DIR     | LA_PAZ           | —                |

- En el flujo **con valorado**, `IMPRIMIR` significa "impreso y dejado en Calahumana" (D-05); en el **sin valorado**, impreso en Ancocagua.
- Los pasos de Dirección Académica y General los registra SEC_DIR (D-33, propuesta).
- **Sede actual** del trámite (`sede_actual_id`): la del usuario que hizo el último paso.
- El bloqueo del file (DEC-029) impide los pasos **hasta imprimir**; después de impreso, el documento ya existe y se termina de entregar.

### 2.3 Tablas (módulo dueño: `hojas-ruta`)

- `hoja_ruta`: `nro_tramite` (único; lo genera S3.2), `gestion`, `file_id` (FK RESTRICT), `tipo_tramite_id`, `estado_actual`, `sede_actual_id`, `nro_valorado` (nulo; obligatorio en la ingesta si el tipo lo requiere, S3.4), `fecha_ingreso`, `fecha_cierre` (al entregar), `created_at`, `updated_at`.
- `movimiento_hoja_ruta`: `hoja_ruta_id`, `accion`, `estado_anterior` (nulo en la ingesta), `estado_nuevo`, `sede_id`, `usuario_id`, `observacion`, `fecha`. **Solo inserción** con `fn_solo_insercion()` (ADR-0003), y `REVOKE UPDATE, DELETE, TRUNCATE` para `siset_app` (DEC-017 #1).
- Trigger `AFTER INSERT` en `movimiento_hoja_ruta`: copia `estado_nuevo` y `sede_id` a `hoja_ruta`, y `fecha_cierre` si es `ENTREGADO` (modelo-datos, DEC-006). Así el estado de la hoja nunca se desincroniza de su último movimiento.

### 2.4 Servicio y API

- `hojas-ruta/maquina.ts`: la tabla del §2.2 como dato tipado y `accionesPosibles(hoja, file, usuario)` / `validarTransicion(...)`, puras. Es la regla del dominio; Casbin solo exige `hojas-ruta`/`leer` para entrar a la ruta (ADR-0002).
- `aplicarTransicion(nro, accion, observacion?)`, en una transacción: `SELECT … FOR UPDATE` sobre la hoja → validar (estado, flujo, rol, sede, bloqueo) → insertar el movimiento (el trigger actualiza la hoja) → `registrarEvento(CAMBIAR_ESTADO, entidad 'hoja_ruta', antes { estado }, después { estado, accion })`.
- `POST /hojas-ruta/:nro/transiciones` `{ accion, observacion? }` → 200 con el detalle. Errores: 404 `NO_ENCONTRADO`; 409 `TRANSICION_INVALIDA` (el estado no la admite o es de otro flujo); 403 `PROHIBIDO` (otro rol u otra sede); 422 `FILE_BLOQUEADO`.
- `GET /hojas-ruta/:nro` → la hoja, su tipo, el titular (nombre y CI del file), los movimientos con quién y cuándo, y `accionesPosibles` para el usuario de la sesión.
- El file se lee con una función que la raíz pasa desde `files` (ADR-0001): `{ bloqueado, nombre, ci }`.

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                                                                               | Cambio                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema/{catalogos,hojas-ruta}.prisma`, migración nueva                                                                               | `tipo_tramite` (+ seed), enum, `hoja_ruta`, `movimiento_hoja_ruta`, triggers, `REVOKE`. |
| `apps/api/src/modulos/hojas-ruta/{maquina,hojas-ruta.servicio,hoja-ruta.repositorio,hojas-ruta.esquemas,hojas-ruta.rutas,hojas-ruta.modulo,index}.ts` | **Nuevos** (§2.4).                                                                      |
| `apps/api/src/modulos/files/index.ts`, `apps/api/src/app.ts`                                                                                          | `resumenParaHojaRuta(fileId)`; montar el módulo.                                        |
| `apps/api/test/hojas-ruta-maquina.test.ts`, `test/bd/hojas-ruta-*.test.ts`, `test/matriz-rutas.ts`, `test/bd/esquema.test.ts`                         | §4.                                                                                     |
| `docs/adr/0005-maquina-estados-hojas-ruta.md`, `docs/product/business-rules.md`, `docs/product/modelo-datos.md`, `docs/decisions/LOG.md`              | ADR, reglas, modelo sin `pase`/`dictamen`/`enviado_dictamen_en`, DEC-034.               |

---

## 4 · Plan de tests

| Caso                                                                                                                         | Nivel          |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Tabla completa: cada estado × cada acción × cada flujo × cada rol × sede (válida, 409, 403)                                  | Unit           |
| Los dos flujos de punta a punta: de `RECIBIDO` a `ENTREGADO`, con un movimiento por paso y `fecha_cierre` al entregar        | BD + Supertest |
| Transición inválida (estado o flujo) → 409 y nada cambia; otro rol u otra sede → 403; file bloqueado antes de imprimir → 422 | BD + Supertest |
| Dos transiciones simultáneas sobre la misma hoja → una gana, la otra 409 (`FOR UPDATE`)                                      | BD             |
| `movimiento_hoja_ruta` no admite UPDATE, DELETE ni TRUNCATE; el trigger copia estado y sede                                  | BD             |
| `CAMBIAR_ESTADO` en la bitácora con antes y después                                                                          | BD + Supertest |
| `GET /hojas-ruta/:nro`: movimientos y `accionesPosibles` según quién pregunta                                                | BD + Supertest |
| Matriz HTTP con las dos rutas nuevas; esquema de FKs                                                                         | Supertest / BD |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S3.1-S3.3/SDD.md`, Estado = Aprobado; tickets S3.1 y S3.3 en ClickUp.
- [ ] ADR-0005, `business-rules.md` y `modelo-datos.md` actualizados; DEC-034.
- [ ] Tablas, triggers y servicio con la tabla del §2.2; tests del §4 en verde.
- [ ] Quality gate en verde: `calidad`, `base-de-datos`, `e2e`, `docker`.
- [ ] Commit `S3.1 y S3.3 …` en `feat/S3.1-S3.3-maquina-estados`.

---

## 6 · Riesgos

| Riesgo                                                                 | Gravedad | Mitigación                                                                                 |
| ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| D-34 confirma la revisión con "Observado"                              | Media    | Agregar un estado y dos filas a la tabla; el resto no cambia. Se versiona el SDD y el ADR. |
| D-35 pide registrar envío y recepción entre sedes                      | Media    | Se agregan pasos (`ENVIAR`, `RECIBIR`) o la tabla `pase`; la máquina lo admite.            |
| D-33 dice que firman con cuenta propia (Dirección Académica y General) | Baja     | Roles nuevos en la política y en la tabla; sin cambios de esquema.                         |

---

## 7 · Preguntas abiertas

- **Para la escuela:** D-32 a D-35 ya están en la hoja; este diseño sigue sus propuestas.
- **DEC-034 (va a `LOG.md`):**
  1. Tablas `tipo_tramite` (4 tipos, `requiere_valorado`), `hoja_ruta` y `movimiento_hoja_ruta` (solo inserción, con trigger que actualiza la hoja). No se crean `pase` ni `dictamen` (DEC-033).
  2. La máquina de estados es la tabla del §2.2: dos flujos, rol y sede por paso; el bloqueo del file impide los pasos hasta imprimir. ADR-0005.
  3. `POST /hojas-ruta/:nro/transiciones` (409, 403, 422) y `GET /hojas-ruta/:nro` con las acciones posibles para quien pregunta.
