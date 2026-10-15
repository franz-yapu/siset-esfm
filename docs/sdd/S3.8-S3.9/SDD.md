# SDD — S3.8 y S3.9 · Ingesta, lista y detalle de hojas de ruta conectados

- **Tickets:** S3.8 ("Formulario de ingesta conectado", P-30) y S3.9 ("Lista de hojas de ruta con filtros
  conectada", P-31). Comparten diseño (el servicio de hojas de ruta de la web): un solo SDD. Se crean en ClickUp al
  aprobarlo.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-08; `docs/product/prototipo-pantallas.md` P-30 (ingesta), P-31 (lista y detalle), P-32 (carátula)
  2. `docs/sdd/S3.1-S3.3/SDD.md` y ADR-0005 (máquina de estados, `GET /hojas-ruta/:nro`, transiciones);
     `docs/sdd/S3.2-S3.4/SDD.md` (ingesta y lista)
  3. `docs/decisions/LOG.md` DEC-023 (el mock imita el contrato de la API), DEC-028 (servicio partido mientras dura
     la migración), DEC-033, DEC-034, DEC-035
  4. `docs/product/dudas.md` D-05 (valorado), D-09 (solo egresados, provisional), D-33 (quién anota los pasos de
     Calahumana), D-34 y D-35 (revisión y pases, en espera)

---

## 1 · Alcance

### Entra

- **S3.8 (P-30):** formulario de ingesta contra `POST /hojas-ruta`: titular buscado en `GET /files` (solo
  egresados), tipo del catálogo, valorado solo si el tipo lo requiere.
- **S3.9 (P-31):** lista contra `GET /hojas-ruta` con filtros y paginación en el servidor.
- **Detalle de la hoja de ruta** (también P-31) contra `GET /hojas-ruta/:nro` y `POST /hojas-ruta/:nro/transiciones`:
  la lista abre el detalle, y sin conectarlo cada fila llevaría a "Trámite no encontrado" (ver premisas).
- **Catálogo de tipos de trámite** en la API: `GET /hojas-ruta/tipos`.
- Un servicio de hojas de ruta **con el contrato de la API** en los dos modos (`hojasRuta.api.ts` y
  `hojasRuta.mock.ts`), como DEC-023 y DEC-028.

### No entra (a propósito)

- **QR en PDF y carátula imprimible** (S3.5). La carátula de hoy (P-32) solo cambia de dónde lee los datos, para que
  el enlace del detalle no se rompa.
- **Seguimiento público** (S4.x), **pases** (S3.6, S3.10; D-35), **revisión de Kardex** (S4.6; D-34), dictámenes,
  emisión, inicios por rol y "Mis trámites": siguen con el servicio del prototipo hasta su ticket.
- Requisitos por tipo de trámite (D-21: la escuela no dio la lista).

### Premisas verificadas (de `task-brief`)

| Premisa del ticket                       | Qué hay de verdad en el repo                                                                                                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "UI hecha (P-30, P-31)", solo conectarla | ⚠️ Las pantallas usan el **flujo viejo de 11 estados** (`REGISTRADO`, `EN_TRANSITO_ANC`, `OBSERVADO`, dictamen…) y 3 tipos de trámite. La API usa la máquina de ADR-0005 (9 estados, dos flujos) y los 4 tipos de D-21. Hay que cambiar estados, acciones y tipos, no solo la fuente.       |
| `hojasRutaService` es de P-30 y P-31     | ⚠️ Lo usan **11 pantallas y un componente** (además de P-30, P-31 y P-32: seguimiento, revisión, dictamen, firma y entrega, inicios de SEC_DIR y Kardex, mis trámites y las secciones de la demo del file). Conectarlo entero las rompe. **Se parte en dos** (§2.1), como files en DEC-028. |
| La lista no necesita el detalle          | ❌ Cada fila abre `/hojas-ruta/:nro`. Con la lista en la API y el detalle en el mock, ninguna fila abriría. El detalle entra (la API ya existe desde S3.3; no tenía ticket de pantalla).                                                                                                    |
| Filtros de P-31: sede y rango de fechas  | ⚠️ La API filtra por texto, estado, tipo y gestión (DEC-035). Se usan esos. "Sede actual" queda como columna.                                                                                                                                                                               |
| Marca ⚠ "detenido" (10 días sin moverse) | ⚠️ La fila de la API no trae la fecha del último movimiento. Se quita de la lista; se puede volver con el panel del Coordinador (D-20).                                                                                                                                                     |
| "Registrar y enviar a Ancocagua"         | ⚠️ Ya no hay envío (D-35). El paso que sigue a `RECIBIDO` es `AVISAR_KARDEX` (SEC_DIR, La Paz). El botón pasa a "Registrar y avisar a Kardex".                                                                                                                                              |
| Tipos de trámite en la web               | ❌ No hay catálogo en la API; la web tiene 3 tipos fijos del prototipo.                                                                                                                                                                                                                     |
| Titular por CI entre todos los files     | ⚠️ La API solo acepta files de **egresados** no bloqueados (DEC-035, D-09 provisional). La búsqueda filtra `condicion=EGRESADO` y muestra el bloqueo.                                                                                                                                       |

---

## 2 · Diseño técnico

### 2.1 Dos servicios mientras dura la migración (como DEC-028)

| Servicio                                                                  | Contrato                        | Lo usan                                                |
| ------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| `hojasRuta.service.ts` → `hojasRuta.api.ts` / `hojasRuta.mock.ts` (nuevo) | El de la API (DEC-034, DEC-035) | P-30, P-31 lista y detalle, P-32 (solo sus datos)      |
| `hojasRuta-prototipo.service.ts` (el de hoy, renombrado)                  | El del prototipo, sin cambios   | Las otras 7 pantallas y el componente, hasta su ticket |

- Nombre en `VITE_USAR_API`: `hojasRuta` (ya existe en `_modo.ts`).
- **Mock:** almacén propio en `mocks/` con el modelo nuevo (9 estados, 4 tipos, movimientos), sembrado con ~8 hojas
  sobre los files egresados de la demo. No traduce el almacén viejo: los estados no se corresponden uno a uno. Usa una
  copia de la tabla de transiciones en `lib/maquina-hojas-ruta.ts` (la web no importa código de la API), con las
  mismas reglas de rol, sede y bloqueo, y los mismos códigos de error (`TRANSICION_INVALIDA`, `FILE_BLOQUEADO`,
  `FILE_NO_EGRESADO`, `TIPO_TRAMITE_INEXISTENTE`, `VALIDACION`).
- **Consecuencia en la demo:** las pantallas que siguen con el prototipo (revisión, dictamen, seguimiento) muestran
  sus hojas viejas, y las nuevas solo se ven en P-30/P-31. Es lo mismo que pasó con files.

### 2.2 API: catálogo de tipos

`GET /api/v1/hojas-ruta/tipos` (permiso `hojas-ruta`/`leer`) → `[{ codigo, nombre, requiereValorado }]` de los tipos
activos, ordenados por nombre. Vive en el módulo `hojas-ruta`, dueño de `tipo_tramite`. Se registra antes de
`/hojas-ruta/:nro`, para que `tipos` no se lea como número de trámite.

### 2.3 Tipos, configuración y hooks de la web

- `types/hojas-ruta.ts`: `EstadoHojaRuta`, `AccionHojaRuta`, `TipoTramiteCatalogo`, `FilaHojaRuta`,
  `DetalleHojaRuta`, `FiltrosHojasRuta`, `DatosCrearHojaRuta` (el contrato de la API).
- `config/estados-hoja-ruta.ts`: etiqueta y colores de los 9 estados (`EstadoHojaRutaBadge`).
- `Timeline` recibe los pasos ya armados (estado con su etiqueta y color, fecha, sede, usuario, observación), así
  lo usan el prototipo y el detalle nuevo sin conocer los estados del otro.
- `hooks/useHojasRuta.ts` (TanStack Query, como `useFiles`): lista, detalle, tipos (duran la sesión), y las
  mutaciones de crear y de transición, que invalidan la lista y el detalle.

### 2.4 P-31 · Lista (S3.9)

- Filtros: texto (N.º, CI o nombre; espera de 300 ms), estado (los 9), tipo (del catálogo) y gestión. Van en la URL.
- Columnas: N.º, titular, CI, tipo, estado, sede actual, ingreso, días desde el ingreso (o la fecha de cierre si
  está entregado).
- Paginación en el servidor, 20 por página. "Nueva hoja de ruta" solo con el permiso `nueva-hr` (SEC_DIR).

### 2.5 P-31 · Detalle

- Cabecera: N.º, estado, tipo, ingreso. Datos: tipo, valorado, sede actual, estado, fecha de cierre.
- Titular: nombre, CI, enlace al file y aviso si el file está bloqueado.
- Línea de tiempo con los movimientos (acción, quién, sede, observación).
- **Acciones:** las que devuelve la API en `acciones` (ya filtradas por rol, sede y estado). Las deshabilitadas
  (file bloqueado) se muestran con su motivo. Cada una pide confirmación con una observación opcional; `ENTREGAR`
  mantiene el modal de entrega (a quién y CI), que se guarda como observación ("Entregado a … (CI …)").
- Errores: `409 TRANSICION_INVALIDA` (alguien más la movió) → aviso y recarga; `403` → aviso.

### 2.6 P-30 · Ingesta (S3.8)

- **Titular:** búsqueda con `GET /files?texto=…&condicion=EGRESADO&porPagina=8` (espera de 300 ms). Cada sugerencia
  muestra CI, nombre, semáforo y si está bloqueado. Si no hay resultados: "No hay files de egresados con ese dato.
  Pide a Kardex que registre o actualice el file."
- **Tipo:** select del catálogo. El **N.º de valorado** aparece y es obligatorio solo si `requiereValorado`; si no,
  no se manda.
- **Botones:** "Registrar y avisar a Kardex" (crea y aplica `AVISAR_KARDEX`) y "Solo registrar". Si el aviso falla
  después de crear, la hoja queda registrada y se avisa ("Se registró, pero no se pudo avisar a Kardex: …").
- Errores de la API: `FILE_BLOQUEADO` y `FILE_NO_EGRESADO` debajo del titular; `VALIDACION` en el campo; `403` (sede
  que no es La Paz) como aviso general.
- El modal de éxito queda igual (número, QR de seguimiento, ver trámite, carátula, registrar otro).

### 2.7 Despliegue de prueba

`hojasRuta` se suma a `VITE_USAR_API` del workflow _Publicar imágenes_ y de Playwright (`api` y `api-real`). En
`siset.vertexall.com` las hojas de prueba de `bd:datos-prueba` aparecen en la lista y se pueden mover paso a paso con
las cuentas de prueba.

---

## 3 · Cambios por archivo/módulo

| Archivo                                                                                                                 | Cambio                                 |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `apps/api/src/modulos/hojas-ruta/{hojas-ruta.rutas,hojas-ruta.servicio,hoja-ruta.repositorio,hojas-ruta.esquemas}.ts`   | `GET /hojas-ruta/tipos` (§2.2).        |
| `apps/web/src/services/hojasRuta-prototipo.service.ts` + los 8 archivos que lo usan                                     | **Renombrado**; solo cambia el import. |
| `apps/web/src/services/hojasRuta.{service,api,mock}.ts`, `mocks/hojas-ruta-v2.ts`                                       | **Nuevos** (§2.1).                     |
| `apps/web/src/lib/maquina-hojas-ruta.ts`, `types/hojas-ruta.ts`, `config/estados-hoja-ruta.ts`, `hooks/useHojasRuta.ts` | **Nuevos** (§2.1, §2.3).               |
| `apps/web/src/components/ui/Timeline.tsx` y sus usos                                                                    | Recibe pasos armados (§2.3).           |
| `apps/web/src/pages/hojas-ruta/{HojasRuta,DetalleHojaRuta,NuevaHojaRuta,Caratula}.tsx`                                  | Conectadas (§2.4–2.6).                 |
| `.github/workflows/publicar-imagenes.yml`, `apps/web/playwright.config.ts`                                              | `hojasRuta` en `VITE_USAR_API`.        |
| Tests (§4)                                                                                                              | **Nuevos**.                            |
| `docs/decisions/LOG.md`                                                                                                 | DEC-037.                               |

---

## 4 · Plan de tests

| Caso                                                                                                                        | Nivel          |
| --------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `GET /hojas-ruta/tipos`: los 4 tipos con `requiereValorado`; 401 sin token; matriz HTTP                                     | BD + Supertest |
| `hojasRuta.api`: cada función llama a la ruta correcta con los parámetros y traduce los errores                             | Unit           |
| `hojasRuta.mock`: mismo contrato que la API (paginación, filtros, orden, correlativo, valorado según el tipo, errores)      | Unit           |
| `maquina-hojas-ruta` de la web: los dos flujos completos, rol y sede por paso, bloqueo hasta imprimir                       | Unit           |
| Demo: SEC_DIR registra un historial (con valorado) y un certificado (sin valorado), los ve en la lista y avisa a Kardex     | E2E            |
| Modo API (`page.route`): la lista manda filtros y página; la ingesta muestra `FILE_BLOQUEADO` debajo del titular            | E2E            |
| API real: SEC_DIR registra y avisa; Kardex ve "Registrar que Kardex lo recogió" y lo hace; la línea de tiempo tiene 3 pasos | E2E            |
| Las pantallas del prototipo siguen funcionando (`recorrido`/`flujos.spec.ts`)                                               | E2E            |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S3.8-S3.9/SDD.md`, Estado = Aprobado; tickets en ClickUp.
- [ ] P-30, P-31 (lista y detalle) y los datos de P-32 contra la API; demo funcionando con el modelo nuevo.
- [ ] `GET /hojas-ruta/tipos`.
- [ ] Tests del §4 y quality gate en verde; DEC-037.
- [ ] Desplegado en la prueba (`siset.vertexall.com`) y verificado con las cuentas de prueba.
- [ ] Commit `S3.8 y S3.9 …` en `feat/S3.8-S3.9-hojas-ruta-conectadas`.

---

## 6 · Riesgos

| Riesgo                                                                                  | Gravedad | Mitigación                                                                                                                            |
| --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| La tabla de transiciones queda en dos lugares (API y mock de la web) y se desincronizan | Media    | La de la API manda (do-not-touch, ADR). La copia solo la usa la demo; el E2E contra la API real cubre lo real. Comentario en las dos. |
| En la demo conviven hojas viejas (otras pantallas) y nuevas (P-30/P-31)                 | Baja     | Igual que files; desaparece al conectar cada pantalla.                                                                                |
| La escuela cambia el flujo (D-32 a D-35)                                                | Media    | Las pantallas no conocen la tabla: muestran las acciones que manda la API.                                                            |
| "Registrar y avisar" son dos llamadas: el aviso puede fallar después de crear           | Baja     | La hoja queda en `RECIBIDO` (válido) y el mensaje lo dice; el aviso se puede dar desde el detalle.                                    |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna nueva. Lo que depende de D-32 a D-35 ya está en la máquina de la API.
- **DEC-037 (va a `LOG.md`):**
  1. El servicio de hojas de ruta de la web se parte: `hojasRuta.service` con el contrato de la API (P-30, P-31,
     datos de P-32) y `hojasRuta-prototipo.service` para el resto hasta su ticket.
  2. El mock de la demo usa el modelo nuevo con una copia de la tabla de transiciones; la de la API manda.
  3. El detalle de la hoja de ruta se conecta con la lista (las acciones vienen de la API); la ingesta ofrece
     "Registrar y avisar a Kardex"; los filtros son los de la API; la marca "detenido" sale de la lista.
  4. `GET /hojas-ruta/tipos` como catálogo de tipos de trámite.
