# SDD — S2.4 · Requisitos del file (API y pestaña de P-41)

- **Ticket:** S2.4 (backlog 2026-10-12: "API de requisitos: TACFI, TCLO, certificado de notas"). Se crea en ClickUp al aprobar este SDD.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/product/dudas.md` **D-04** (2 TACFI artísticos, en 1.º y 2.º; TCLO con defensas de 1.º a 3.º en niveles básico, intermedio y avanzado; requisitos para defender el diseño metodológico), **D-04b** (una defensa por año; si se reprueba o no se presenta, se programa al año siguiente y debe aprobar las dos; la extemporánea solo antes de la defensa del diseño metodológico), **D-07b** (reprobar no obliga a repetir TACFI ni TCLO), **D-18** (unos 30 requisitos, la lista llega después)
  2. `docs/decisions/LOG.md` — DEC-007, DEC-015 (`requisitos`: KARDEX crea, lee y edita; SEC_COORD y COORDINADOR leen; SEC_DIR no), DEC-016 (catálogo con una fila por requisito, año y nivel), DEC-019 #3, DEC-027, DEC-028
  3. `docs/product/modelo-datos.md` §`requisito_tipo` y §`requisito_file` (`CHECK` completo ⇒ fecha y responsable)
  4. `docs/sdd/S2.1/SDD.md` v1.1, `docs/sdd/S2.2/SDD.md`, `docs/sdd/S2.9-S2.10/SDD.md`

---

## 1 · Alcance

### Entra

- `GET /api/v1/files/:id/requisitos`: los requisitos **activos** del catálogo, cada uno con su estado en el file (sin fila en `requisito_file` = `PENDIENTE`).
- `PUT /api/v1/files/:id/requisitos/:codigo`: registra o actualiza un requisito del file (estado, fecha, n.º de documento, observación). Solo KARDEX.
- `GET /api/v1/catalogos/requisitos`: el catálogo activo, para la web.
- Pestaña **Requisitos** de P-41 conectada en modo API, agrupada por año de formación.
- Evento `EDITAR` en la bitácora del file por cada cambio (DEC-007).

### No entra (a propósito)

- **Administrar el catálogo** (agregar los ~30 requisitos de D-18): ticket aparte cuando llegue la lista; por ahora el catálogo se carga con el seed.
- **Semáforo** (S2.5): esta API da el estado de cada requisito; el color lo calcula S2.5.
- **"Mi file"** del estudiante (S2.7), **matrículas** (D-30).
- La regla "la defensa extemporánea solo antes de la del diseño metodológico" (D-04b): el sistema todavía no registra la defensa del diseño metodológico; se anota en la observación.

### Premisas verificadas (de `task-brief`)

| Premisa                                   | Qué hay de verdad                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "Bloqueado por D-04 y D-18"               | ✅ D-04 y D-04b respondidas. ⚠️ D-18 pendiente, pero el catálogo provisional (S2.1) ya tiene los 6 requisitos conocidos. |
| Tablas                                    | ✅ `requisito_tipo` (catalogos) y `requisito_file` (files), con `CHECK` (COMPLETO ⇒ fecha y responsable). Sin migración. |
| "TCLO completo solo con el nivel exigido" | ✅ Cada nivel es su propia fila del catálogo (DEC-016): no hace falta una regla aparte.                                  |
| Permisos                                  | ✅ DEC-015: SEC_DIR no ve requisitos.                                                                                    |
| La web                                    | ⚠️ La pestaña solo existe en la demo, con 3 requisitos genéricos. Se conecta aquí.                                       |
| "Kardex edita el catálogo" (D-18)         | ⚠️ No hay endpoints ni recurso en la política. Ticket aparte.                                                            |

---

## 2 · Diseño técnico

### 2.1 Contratos

```jsonc
// GET /files/12/requisitos
[
  {
    "codigo": "TCLO_BASICO",
    "nombre": "TCLO nivel básico",
    "descripcion": "Defensa del taller de lengua originaria.",
    "anioFormacion": 1,
    "nivel": "BASICO",
    "obligatorio": true,
    "estado": "OBSERVADO", // PENDIENTE | COMPLETO | OBSERVADO
    "fecha": null,
    "nroDocumento": null,
    "observacion": "No se presentó; reprogramada para la gestión 2026 (D-04b)",
    "registradoPor": { "id": 3, "nombre": "María Quispe" }, // null si nunca se registró
    "actualizado": "2026-10-14T15:00:00.000Z", // null si nunca se registró
  },
]
```

Orden: año de formación (los sin año al final) y código.

```jsonc
// PUT /files/12/requisitos/TCLO_BASICO
{ "estado": "COMPLETO", "fecha": "2026-08-14", "nroDocumento": "TCLO-0451", "observacion": null }
```

- `estado` obligatorio. `COMPLETO` exige `fecha` (lo pide el `CHECK`; `registrado_por` lo pone la API con la sesión). `OBSERVADO` exige `observacion` (la defensa reprobada o a la que no se presentó, D-04b).
- `fecha` AAAA-MM-DD, no futura. `nroDocumento` hasta 40; `observacion` hasta 255.
- Responde 200 con el requisito actualizado. Errores: 404 `NO_ENCONTRADO` (file o código inexistente o inactivo), 400 `VALIDACION`.
- Si nada cambió de verdad: 200 sin escribir ni registrar.

### 2.2 Módulos

- `files` es dueño de `requisito_file`. El catálogo (`requisito_tipo`) es de `catalogos`, que agrega `obtenerRequisitosActivos(cliente)` y `GET /catalogos/requisitos` (permiso `requisitos`/`leer`). La raíz le pasa la función a `files` (ADR-0001), igual que las especialidades.
- El nombre de quien registró sale de `seguridad.describirUsuarios` + `personas`, como en la bitácora (S6.4): la raíz arma la función.

### 2.3 Bitácora

`EDITAR` con `entidad = 'file_academico'` y `entidadId` = el file, para que aparezca en el historial del file (S2.10): `antes` y `despues` con `{ requisito: 'TCLO_BASICO', estado, fecha, nroDocumento, observacion }` (solo los campos que cambiaron, más el código).

### 2.4 Web (P-41)

- `requisitosService` (`api` y `mock`, mismo contrato). El mock guarda los requisitos del catálogo provisional en el almacén del prototipo y los inicializa desde los 3 genéricos de la demo (TACFI → TACFI_1 y TACFI_2; TCLO → el nivel que tenga; CERT_NOTAS).
- Pestaña **Requisitos** en los dos modos: tarjetas agrupadas por año ("1.º año", "2.º año"…, "Sin año"), con estado, fecha, n.º, observación y quién lo registró. KARDEX ve "Registrar" o "Actualizar", que abre un modal con estado, fecha, n.º y observación (los errores van al campo). SEC_COORD y COORDINADOR solo leen; SEC_DIR no ve la pestaña.
- La pestaña de requisitos de `SeccionesDemoFile` y `filesPrototipoService.registrarRequisito` se borran (las otras pantallas del prototipo siguen leyendo su modelo).
- El aviso de P-41 deja de mencionar los requisitos.

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                                                                                                          | Cambio                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `apps/api/src/modulos/catalogos/{requisito.repositorio,catalogos.modulo,index}.ts`                                                                                               | Catálogo activo y `GET /catalogos/requisitos`.    |
| `apps/api/src/modulos/files/{requisitos.esquemas,requisitos.servicio,requisito.repositorio}.ts` + rutas                                                                          | Las dos rutas del file (§2.1).                    |
| `apps/api/src/app.ts`                                                                                                                                                            | Pasa el catálogo y `describirUsuarios` a `files`. |
| `apps/api/test/matriz-rutas.ts`, `test/bd/requisitos.test.ts`                                                                                                                    | Filas de la matriz y tests (§4).                  |
| `apps/web/src/{types/requisitos.ts,services/requisitos.{service,api,mock}.ts,hooks/useRequisitos.ts,lib/requisitos.ts}`                                                          | **Nuevos**.                                       |
| `apps/web/src/components/file/{RequisitosFile,ModalRequisitoFile}.tsx`, `pages/kardex/DetalleFile.tsx`, `SeccionesDemoFile.tsx`, `ModalesFile.tsx`, `files-prototipo.service.ts` | Pestaña conectada; se borra lo de la demo.        |
| `docs/decisions/LOG.md`                                                                                                                                                          | DEC-030.                                          |

---

## 4 · Plan de tests

| Caso                                                                                                                          | Nivel          |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Listar: todos los activos del catálogo, en orden; sin registro = PENDIENTE; un requisito inactivo no aparece                  | BD + Supertest |
| Registrar COMPLETO con fecha: queda con `registrado_por` = Kardex; `EDITAR` en el historial del file con antes y después      | BD + Supertest |
| Actualizar el mismo (OBSERVADO → COMPLETO): una sola fila (`UNIQUE`); evento con solo lo que cambió; sin cambios → sin evento | BD + Supertest |
| COMPLETO sin fecha, OBSERVADO sin observación, fecha futura, estado desconocido → 400; código o file inexistente → 404        | BD + Supertest |
| Permisos: matriz HTTP (SEC_DIR 403 en las tres rutas; SEC_COORD y COORDINADOR leen; solo KARDEX registra)                     | Supertest      |
| `requisitosService` en los dos modos: mismo contrato y errores                                                                | Unit           |
| Demo: Kardex marca la defensa de TCLO básico como observada y después completa; aparece en el historial                       | E2E            |
| API real (E13): Kardex completa TACFI_1 de un file y COORDINADOR lo ve sin poder editar                                       | E2E            |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S2.4/SDD.md`, Estado = Aprobado; ticket S2.4 en ClickUp.
- [ ] Rutas, eventos y pestaña conectados; demo y API con el mismo comportamiento.
- [ ] DEC-030 en `LOG.md`.
- [ ] Tests del §4 y quality gate en verde.
- [ ] Commit `S2.4 …` en `feat/S2.4-requisitos`.

---

## 6 · Riesgos

| Riesgo                                                                     | Gravedad | Mitigación                                                                                     |
| -------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Llega la lista de D-18 con requisitos de otra forma (por trámite, sin año) | Media    | El catálogo ya admite `anio_formacion` nulo y `obligatorio`; agregar filas no cambia esta API. |
| Kardex quiere marcar "reprobó / no se presentó" como estado propio         | Baja     | Hoy es `OBSERVADO` + observación; si hace falta, otro valor del enum con una migración chica.  |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna nueva. D-18 (la lista de ~30 requisitos) ya está en la hoja.
- **DEC-030 (va a `LOG.md`):**
  1. Requisitos del file: `GET /files/:id/requisitos` (catálogo activo + estado; sin registro = PENDIENTE) y `PUT /files/:id/requisitos/:codigo` (solo KARDEX). COMPLETO exige fecha; OBSERVADO, observación (defensa reprobada o no presentada, D-04b).
  2. El cambio se registra como `EDITAR` del file (aparece en su historial).
  3. `GET /catalogos/requisitos` con permiso `requisitos`/`leer`. La administración del catálogo queda para cuando llegue D-18.
  4. La pestaña de requisitos de P-41 se conecta en los dos modos; la del prototipo se borra.
