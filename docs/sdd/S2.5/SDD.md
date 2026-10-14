# SDD — S2.5 · Semáforo del file

- **Ticket:** S2.5 (backlog 2026-10-12: "Motor de semáforo por requisito y global, parametrizado desde requisito_tipo"). Se crea en ClickUp al aprobar este SDD.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-14)
- **Versión:** 1.1 · **Fecha:** 2026-10-14
  - 1.1 (al implementar): el rojo sin bloqueo se muestra como "Requisito observado" (el texto de siempre era
    "File bloqueado", que sería falso). La tabla de casos vive en `apps/api/test/fixtures/casos-semaforo.ts` y la
    usan los dos tests.
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-06 CA2 (el semáforo se actualiza al instante) y RF-07 CA1 (semáforo verde/amarillo/rojo por requisito y global)
  2. `docs/product/business-rules.md` §File: "verde (completo), amarillo (pendiente/parcial), rojo (faltante obligatorio o bloqueo)"
  3. `docs/product/prototipo-pantallas.md` (SPEC §8.4 en `apps/web/src/lib/reglas.ts`: rojo = bloqueado; amarillo = algún pendiente; verde = todo completo)
  4. `docs/product/dudas.md` D-04b (las defensas pendientes pasan al año siguiente; la extemporánea, antes de la del diseño metodológico), D-30 (matrículas), D-07b
  5. `docs/decisions/LOG.md` — DEC-016 (`obligatorio` en el catálogo), DEC-027, DEC-028 #2 (semáforo oculto con la API hasta S2.5), DEC-029, DEC-030

---

## 1 · Alcance

### Entra

- El semáforo **global** del file, calculado en la API y devuelto en `FileDetalle` (`semaforo`), con el filtro `semaforo` en `GET /files`.
- El color de **cada requisito** (ya lo muestra S2.4 en la web; se documenta la regla).
- La web muestra el semáforo con la API (búsqueda, filtro y cabecera de P-41), igual que en la demo.

### No entra (a propósito)

- **"Requisito atrasado"** (rojo por faltante obligatorio según el año): hace falta saber qué año cursa el estudiante (matrículas, D-30) y cuándo defiende el diseño metodológico (D-04b). Se pregunta en **D-31**.
- Los efectos del semáforo en trámites, dictamen y emisión (S3.x–S5.x).
- Las otras pantallas del prototipo siguen con su semáforo propio hasta su ticket (DEC-028).

### Premisas verificadas (de `task-brief`)

| Premisa                                             | Qué hay de verdad                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| "Parametrizado desde `requisito_tipo`"              | ✅ `obligatorio` en el catálogo; el estado de cada requisito sale de S2.4.                                                                |
| "Rojo por faltante obligatorio"                     | ⚠️ No dice cuándo un pendiente está atrasado; depende del año que cursa (D-30) y de la defensa del diseño (D-04b). → D-31; no se inventa. |
| OBSERVADO (defensa reprobada o no presentada, S2.4) | ✅ Es un problema real, no un "todavía no": rojo.                                                                                         |
| Dónde se calcula                                    | ⚠️ Hoy solo en la web (modelo del prototipo). Pasa a la API para filtrar en el servidor y que todas las pantallas coincidan.              |

---

## 2 · Diseño técnico

### 2.1 Regla (provisional hasta D-31)

Solo cuentan los requisitos **obligatorios y activos** del catálogo.

| Color global | Cuándo                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| **ROJO**     | El file está bloqueado (DEC-029), o algún requisito está **OBSERVADO** |
| **AMARILLO** | Algún requisito está **PENDIENTE** (o sin registrar)                   |
| **VERDE**    | Todos están **COMPLETOS**                                              |

Por requisito: COMPLETO → verde, PENDIENTE → amarillo, OBSERVADO → rojo (como ya lo muestra S2.4).

Una función pura `semaforoDelFile({ bloqueado, estados })` en `files/semaforo.ts`, con su tabla de casos; la web tiene la misma en `lib/semaforo.ts` (para el mock) y un test de paridad compara las dos con la misma tabla, como el de la política (S1.11).

### 2.2 API

- `FileDetalle` suma `semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'` en `GET /files`, `GET /files/:id`, crear, editar, bloquear y desbloquear.
- `GET /files?semaforo=ROJO` filtra en el servidor. El listado ya arma todo en memoria (152 files, §2.4 de S2.2): se lee el catálogo una vez y los `requisito_file` de los files filtrados en una consulta.
- Sin migración ni eventos nuevos: el semáforo no se guarda, se calcula.

### 2.3 Web

- P-40: columna y filtro "Semáforo" también con la API (se quita la condición `todoMock()`).
- P-41: la cabecera muestra el semáforo de `FileDetalle` (deja de leer el prototipo).
- El mock calcula con la misma función.
- La pestaña Requisitos invalida el file al registrar, para que la cabecera se actualice al instante (RF-06 CA2).

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                        | Cambio                                                 |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/api/src/modulos/files/semaforo.ts`                                                       | **Nuevo**: regla pura (§2.1).                          |
| `apps/api/src/modulos/files/{files.esquemas,files.servicio,requisito.repositorio}.ts`          | `semaforo` en `FileDetalle`, filtro, lectura por lote. |
| `apps/api/test/files-semaforo.test.ts`, `test/bd/files.test.ts`                                | Tabla de casos y filtro.                               |
| `apps/web/src/lib/semaforo.ts` (+ test de paridad), `types/files.ts`, `services/files.mock.ts` | Mismo cálculo en el mock.                              |
| `apps/web/src/pages/kardex/{Files,DetalleFile}.tsx`                                            | Semáforo con la API.                                   |
| `docs/product/business-rules.md`, `docs/decisions/LOG.md`, `dudas.md` + hoja                   | Regla provisional, DEC-031, D-31.                      |

---

## 4 · Plan de tests

| Caso                                                                                                               | Nivel                         |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Tabla de la regla: bloqueado, OBSERVADO, PENDIENTE, sin registro, todo COMPLETO, no obligatorio ignorado           | Unit (API y web, misma tabla) |
| `GET /files/:id` trae el semáforo; cambia al registrar un requisito y al bloquear                                  | BD + Supertest                |
| `GET /files?semaforo=` filtra (ROJO, AMARILLO, VERDE) y pagina                                                     | BD + Supertest                |
| Demo y modo API: columna y filtro de semáforo en P-40; la cabecera de P-41 cambia al completar el último requisito | E2E                           |

---

## 5 · Definition of Done

- [x] SDD en `docs/sdd/S2.5/SDD.md`, Estado = Aprobado; ticket S2.5 en ClickUp.
- [x] Semáforo calculado en la API, con filtro; la web lo muestra en los dos modos.
- [x] D-31 en la hoja y en `dudas.md`; regla provisional en `business-rules.md`; DEC-031.
- [x] Tests del §4 y quality gate en verde.
- [x] Commit `S2.5 …` en `feat/S2.5-semaforo`.

---

## 6 · Riesgos

| Riesgo                                                                               | Gravedad | Mitigación                                                                                              |
| ------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| Casi todos los estudiantes salen en amarillo (les faltan requisitos de años futuros) | Media    | Es lo que dice la regla hoy; D-31 define cuándo cuenta un requisito. Cambiar la regla no cambia la API. |
| Las pantallas del prototipo muestran otro color                                      | Baja     | Usan su modelo hasta su ticket (DEC-028); en la demo coinciden en la mayoría de los casos.              |

---

## 7 · Preguntas abiertas

- **D-31 (a la hoja):** ¿desde cuándo un requisito que falta es un **problema** (rojo) y no solo "todavía no lo hizo" (amarillo)? Por ejemplo, ¿un estudiante de 3.º sin el TACFI de 1.º? ¿O solo importa que esté todo completo antes de la defensa del diseño metodológico? Mientras tanto: rojo solo por bloqueo o requisito observado.
- **DEC-031 (va a `LOG.md`):**
  1. El semáforo se calcula en la API (no se guarda): rojo si el file está bloqueado o tiene un requisito obligatorio OBSERVADO; amarillo si alguno está pendiente; verde si todos están completos. Provisional hasta D-31.
  2. `semaforo` en `FileDetalle` y filtro en `GET /files`. La web lo muestra en los dos modos.
