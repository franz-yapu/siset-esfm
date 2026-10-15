# SDD — S3.2 y S3.4 · Correlativo, ingesta y lista de hojas de ruta (API)

- **Tickets:** S3.2 ("Correlativo HR-AAAA-NNNNNN por gestión") y S3.4 ("POST /hojas-ruta (ingesta)"), más la API de lista que necesita S3.9. Comparten diseño: un solo SDD. Se crean en ClickUp al aprobarlo.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-14)
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-08 (CA1 SEC_DIR registra un trámite vinculado a un file; CA2 correlativo único por gestión, en transacción)
  2. `docs/product/business-rules.md` §Correlativo y §Hoja de ruta (DEC-034); `docs/do-not-touch.md` (generador de correlativo: ADR)
  3. `docs/product/modelo-datos.md` (`hoja_ruta_correlativo`, `fn_siguiente_nro_hoja_ruta`)
  4. `docs/product/dudas.md` D-05 (los certificados no llevan valorado), D-08, D-09 (sin trámites de estudiantes), D-32 (dónde se reciben los certificados)
  5. `docs/decisions/LOG.md` DEC-017 (paginación), DEC-029 (bloqueo), DEC-033, DEC-034; ADR-0005

---

## 1 · Alcance

### Entra

- **Correlativo** `HR-AAAA-NNNNNN` por gestión, generado en la base dentro de la transacción de la ingesta. ADR-0006.
- `POST /api/v1/hojas-ruta` (ingesta): crea la hoja en `RECIBIDO` con su primer movimiento (`REGISTRAR`) y el evento `CREAR`.
- `GET /api/v1/hojas-ruta`: lista paginada con filtros.

### No entra (a propósito)

- QR y carátula (S3.5); formulario y lista en la web (S3.8, S3.9); seguimiento público (S4.x).
- Requisitos por tipo de trámite: la escuela no dio la lista (D-21).

### Premisas verificadas (de `task-brief`)

| Premisa                                         | Qué hay de verdad                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Correlativo único por gestión, sin carreras     | ⚠️ Diseñado en `modelo-datos.md`, no creado. En `do-not-touch.md`: ADR-0006.                         |
| SEC_DIR registra, vinculado a un file           | ✅ La regla de la ingesta (SEC_DIR desde LA_PAZ) es parte de la máquina (ADR-0005).                  |
| N.º de valorado siempre obligatorio (prototipo) | ⚠️ D-05: los certificados **no** llevan valorado. Obligatorio solo si el tipo lo requiere.           |
| Solo trámites de egresados                      | ⚠️ D-09 dice que los de estudiantes no se llevan; se exige `condicion = EGRESADO` (provisional, §7). |
| Lista para S3.9                                 | ❌ No existe la API.                                                                                 |

---

## 2 · Diseño técnico

### 2.1 Correlativo (ADR-0006)

- Tabla `hoja_ruta_correlativo (gestion SMALLINT PK, ultimo INTEGER NOT NULL)`.
- Función `fn_siguiente_nro_hoja_ruta(p_gestion SMALLINT) RETURNS TEXT`:
  `INSERT … VALUES (p_gestion, 1) ON CONFLICT (gestion) DO UPDATE SET ultimo = hoja_ruta_correlativo.ultimo + 1 RETURNING ultimo`, y devuelve `'HR-' || gestion || '-' || lpad(ultimo, 6, '0')`. Si pasa de 999 999, lanza un error.
- La fila de la gestión queda bloqueada hasta que termina la transacción: dos ingestas simultáneas se ordenan, y si una falla y hace rollback, su número se libera. **No quedan huecos ni repetidos.**
- **Gestión** = año en La Paz (UTC−4) al registrar.
- La app llama la función dentro de la transacción de la ingesta (`SELECT fn_siguiente_nro_hoja_ruta(...)`).

### 2.2 Ingesta

`POST /hojas-ruta` (permiso `hojas-ruta`/`crear`, que solo tiene SEC_DIR):

```jsonc
{ "fileId": 12, "tipoTramite": "HISTORIAL_ACADEMICO", "nroValorado": "004522", "observacion": null }
// 201 → DetalleHojaRuta (el mismo de GET /hojas-ruta/:nro)
```

Validaciones, en este orden:

1. Sede del usuario = LA_PAZ (regla de la máquina, ADR-0005) → si no, 403.
2. `tipoTramite` activo → si no, 422 `TIPO_TRAMITE_INEXISTENTE`.
3. `nroValorado` (1–30): **obligatorio** si el tipo requiere valorado, **prohibido** si no → 400 `VALIDACION`.
4. File existe → si no, 422 `FILE_INEXISTENTE`; condición `EGRESADO` → si no, 422 `FILE_NO_EGRESADO` (D-09, provisional); no bloqueado → si no, 422 `FILE_BLOQUEADO` (DEC-029).

Una transacción: correlativo → `hoja_ruta` (`RECIBIDO`, sede LA_PAZ, `gestion`) → movimiento `REGISTRAR` (el trigger deja estado y sede) → evento `CREAR` (entidad `hoja_ruta`, `entidadId` = nro, `despues` con tipo, file y valorado).

### 2.3 Lista

`GET /hojas-ruta` (permiso `hojas-ruta`/`leer`): `texto` (N.º de trámite, CI o nombre del titular), `estado`, `tipoTramite`, `gestion`, más `pagina`/`porPagina` (DEC-017). Orden: `fecha_ingreso` descendente. Cada fila: nro, tipo, estado, sede actual, titular (nombre, CI), fecha de ingreso y de cierre.

- La búsqueda por titular usa `files` + `personas` (la raíz pasa una función que devuelve los `fileId` cuyos titulares coinciden con el texto, ADR-0001).

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                                                                         | Cambio                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/api/prisma/schema/hojas-ruta.prisma`, migración nueva                                                                                     | `hoja_ruta_correlativo` + función.         |
| `apps/api/src/modulos/hojas-ruta/{maquina,hojas-ruta.servicio,hoja-ruta.repositorio,hojas-ruta.esquemas,hojas-ruta.rutas,hojas-ruta.modulo}.ts` | Regla de ingesta, servicio, lista y rutas. |
| `apps/api/src/modulos/files/index.ts`, `apps/api/src/app.ts`                                                                                    | Funciones para el titular y la búsqueda.   |
| `apps/api/test/bd/hojas-ruta-ingesta.test.ts`, `test/matriz-rutas.ts`, `test/bd/esquema.test.ts`                                                | §4.                                        |
| `docs/adr/0006-correlativo-hojas-ruta.md`, `docs/product/business-rules.md`, `docs/decisions/LOG.md`                                            | ADR, reglas de la ingesta, DEC-035.        |

---

## 4 · Plan de tests

| Caso                                                                                                  | Nivel          |
| ----------------------------------------------------------------------------------------------------- | -------------- |
| Ingesta con valorado: 201, `HR-AAAA-000001` y siguientes, movimiento `REGISTRAR`, evento `CREAR`      | BD + Supertest |
| Certificado sin valorado: 201; con valorado → 400; historial sin valorado → 400                       | BD + Supertest |
| File inexistente, no egresado o bloqueado; tipo inexistente → 422 y no se consume número              | BD + Supertest |
| 20 ingestas simultáneas → 20 números consecutivos, sin huecos ni repetidos                            | BD             |
| Una ingesta que falla después de pedir el número hace rollback y la siguiente recibe ese mismo número | BD             |
| Gestión: el número usa el año en La Paz; cada gestión empieza en 000001                               | BD             |
| SEC_DIR de ANCOCAGUA → 403; KARDEX → 403 (permiso); sin token → 401                                   | BD + Supertest |
| Lista: filtros por texto (nro, CI, nombre), estado, tipo y gestión; paginación y orden                | BD + Supertest |
| Matriz HTTP con las rutas nuevas                                                                      | Supertest      |

---

## 5 · Definition of Done

- [x] SDD en `docs/sdd/S3.2-S3.4/SDD.md`, Estado = Aprobado; tickets en ClickUp.
- [x] ADR-0006 y DEC-035; `business-rules.md` con las reglas de la ingesta.
- [x] Tests del §4 y quality gate en verde.
- [x] Commit `S3.2 y S3.4 …` en `feat/S3.2-S3.4-ingesta`.

---

## 6 · Riesgos

| Riesgo                                          | Gravedad | Mitigación                                                                    |
| ----------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| La escuela sí registra trámites de estudiantes  | Baja     | D-09 dice que no; quitar la regla de `EGRESADO` es una línea.                 |
| El valorado tiene un formato oficial o es único | Baja     | Texto libre hasta 30; si es único, una restricción en una migración chica.    |
| Los certificados se reciben en Ancocagua (D-32) | Media    | La regla de sede de la ingesta está en la máquina: se ajusta allí con el ADR. |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna nueva (D-32 ya pregunta dónde se reciben los certificados). La regla "solo files de egresados" sale de D-09 y queda como provisional en DEC-035.
- **DEC-035 (va a `LOG.md`):**
  1. Correlativo `HR-AAAA-NNNNNN` por gestión (año en La Paz) con `fn_siguiente_nro_hoja_ruta`, dentro de la transacción de la ingesta: sin huecos ni repetidos. ADR-0006.
  2. Ingesta: SEC_DIR desde LA_PAZ; valorado obligatorio solo si el tipo lo requiere; el file debe existir, ser de un egresado (provisional, D-09) y no estar bloqueado.
  3. `GET /hojas-ruta` paginado con filtros por texto, estado, tipo y gestión.
