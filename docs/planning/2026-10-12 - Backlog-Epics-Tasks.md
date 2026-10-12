# SISET — Backlog: Epics & Tasks

**Fecha:** 2026-10-12 · **Fuente:** docs/product/PRD.md (+ scope.md, business-rules.md, dudas.md, LOG.md hasta DEC-001) · **Repo:** `5c2e185`

**Stack detectado:** `apps/web/package.json` → React 18.3 + Vite 6 + TypeScript estricto + Tailwind 4.1 (prototipo navegable con datos en memoria). No existe `apps/api` todavía; el backend previsto es Node 20 + Express + TS + Prisma + PostgreSQL 16 (PRD §5, D-01/D-02 provisionales). No hay plataforma de base (CMS/low-code): todo el backend es net-new.

**IDs:** se conservan los del Plan de Sprints original (`Sx.y`) para que calcen con la convención de ramas/commits (`feat/S1.4-login`). Las horas son las del plan; la columna *Notas* indica cuándo el prototipo ya cubre parte del trabajo.

**Leyenda de Tier:**
- 🟢 nativo/config — el stack lo da; setup fino.
- 🟡 net-new, validado — hay referencia aprobable: PRD con CA medibles y/o pantalla ya construida en el prototipo (`apps/web`).
- 🔴 net-new, sin diseñar — sin mecanismo confirmado.
- 🛑 bloqueado — espera una respuesta del Registro de Dudas (se nombra).

> **Sobre el prototipo:** las pantallas de `apps/web` usan `src/services/` con datos en memoria. Para las tareas FE del plan, el trabajo restante es *conectar el servicio a la API real* (Axios + TanStack Query) y ajustar estados de carga/error; la UI, validaciones y reglas visuales ya existen. Eso baja su riesgo a 🟡 y su esfuerzo real (estimado ≈ 40–50 % de las horas del plan).

---

## Epic 0 — Entorno y fundaciones (Sprint 0)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S0.3 | Monorepo: crear `apps/api`, workspace npm raíz, ESLint + Prettier + TS estricto compartido, Husky | 🟢 | — | 3 | `apps/web` ya existe con TS estricto; falta raíz del workspace, lint y `apps/api`. |
| S0.4 | Docker Compose: PostgreSQL 16, API, web, Nginx | 🟢 | S0.3 | 4 | |
| S0.5 | Pipeline CI (GitHub Actions): lint, typecheck, tests, build de web y api | 🟢 | S0.3 | 3 | Repo aún sin remoto en GitHub. |
| S0.6 | Esquema Prisma inicial: rol, usuario, sede, especialidad, log_auditoria + migración + seed (6 roles, 2 sedes, 5 especialidades) | 🟡 | S0.4 | 4 | Campos en PRD §5; catálogos ya en `apps/web/src/config/catalogos.ts`. **Llave de todo el backend.** |
| S0.7 | Base del API por capas (rutas → controlador → servicio → repositorio), error `{error:{code,message,details}}`, logger, Zod, Helmet, CORS, Swagger | 🟡 | S0.3 | 5 | RNF-07, RNF-10. |
| S0.8 | Base del frontend: cliente Axios + `VITE_API_URL`, TanStack Query, interruptor mock/API en `src/services/` | 🟡 | S0.3 | 2 | Layout, router, tema y componentes **ya hechos** en el prototipo (plan original: 5 h). |
| S0.9 | Entorno staging con HTTPS | 🟡 | S0.4 | 3 | Provisional en VPS propio; el servidor definitivo depende de D-12 (ver S6.10). |

## Epic N — Negocio y validación (transversal)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S0.1 | Reunión con Kardex y Coordinación: demo del prototipo + cerrar dudas bloqueantes (D-01, D-04, D-05, D-06, D-07) | 🟢 | prototipo ✅ | 3 | Llevar el guion del spec §10 y DEC-001. |
| S0.2 | Conseguir plantillas oficiales y ejemplo de hoja de ruta física | 🛑 | S0.1 | 1 | Bloqueo: D-10 (formatos, papel, valorado preimpreso). |
| S1.15 · S2.15 · S3.12 · S4.12 · S5.10 | Review con usuarios + retro + refinamiento (uno por sprint) | 🛑 | fin de cada sprint | 15 | Bloqueo: D-16 (quién es PO y valida). |

## Epic A — Seguridad y RBAC (M1 · Sprint 1)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S1.1 | Tabla refresh_token + campos de bloqueo en usuario (intentos_fallidos, bloqueado_hasta, debe_cambiar_password) | 🟡 | S0.6 | 2 | |
| S1.2 | Servicio bcrypt (costo 12) + política de contraseña (mín. 8, letras y números) | 🟢 | S0.7 | 2 | Regla ya en `apps/web/src/lib/reglas.ts` (`validarClave`). |
| S1.3 | POST /auth/login: CI + contraseña, access JWT 15 min, refresh en cookie httpOnly | 🟡 | S1.1, S1.2 | 6 | D-14 provisional (CI como usuario). |
| S1.4 | Bloqueo tras 5 intentos por 15 min + rate limit 10/min por IP | 🟡 | S1.3 | 3 | |
| S1.5 | POST /auth/refresh (rotación) y /auth/logout (revocación) | 🟡 | S1.3 | 4 | |
| S1.6 | Middleware authenticate + authorize(roles) + helper de propiedad ("solo lo propio") | 🟡 | S1.3 | 5 | Matriz en `apps/web/src/config/permisos.ts` (D-16 valida la matriz; bajo riesgo). |
| S1.7 | Servicio `audit.log()` en la misma transacción; llamado en login/logout/fallos | 🟡 | S0.6 | 3 | D-17 provisional: registro desde la API. |
| S1.8 | CRUD /usuarios: crear, editar, baja lógica, reactivar, resetear contraseña | 🟡 | S1.6 | 6 | |
| S1.9 | Login y cambio obligatorio de contraseña conectados a la API | 🟡 | S1.3, S0.8 | 2 | UI hecha (P-01, P-03). Plan: 5 h. |
| S1.10 | Contexto de sesión real, refresh automático en Axios, cierre por inactividad 15 min | 🟡 | S1.5, S0.8 | 4 | `AuthContext` del prototipo es la base; falta inactividad y refresh. |
| S1.11 | Rutas protegidas por rol, sidebar dinámico, vista 403 | 🟢 | S1.10 | 1 | **Hecho en prototipo**; solo verificar contra API. Plan: 4 h. |
| S1.12 | Paneles de inicio por rol | 🟡 | S1.11 | 1 | Hechos (P-10..P-15) con KPI reales; conectar en cada sprint. |
| S1.13 | Módulo de usuarios conectado a la API | 🟡 | S1.8 | 3 | UI hecha (P-47). Plan: 6 h. |
| S1.14 | Pruebas: unitarias de auth + Supertest (login ok/fallido/bloqueo, 403 por rol, acceso por URL directa) | 🟡 | S1.6 | 6 | PI-01, CPA-01. |

## Epic B — File académico y reglas (M2 · Sprint 2)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S2.1 | Tablas file_academico, matricula, resultado_anual, requisito_tipo, requisito_file + índices; seed del catálogo | 🟡 | S0.6 | 5 | Catálogo parametrizable (mitiga R2). La forma de resultado_anual depende de D-07 → aislar en S2.3. |
| S2.2 | API de files: crear, editar, buscar (CI, nombre, código, especialidad, año) con paginación de servidor | 🟡 | S2.1, S1.6 | 6 | |
| S2.3 | API de matrículas y resultados anuales | 🛑 | S2.1 | 4 | Bloqueo: D-07 (¿resultado anual o nota por UF? ¿de qué sistema viene?). |
| S2.4 | API de requisitos: TACFI (recepción física), TCLO (nivel, n.º), certificado de notas | 🛑 | S2.1 | 5 | Bloqueo: D-04 (qué es TACFI/TCLO, nivel exigido) y D-18 (otros requisitos). |
| S2.5 | Motor de semáforo por requisito y global, parametrizado desde requisito_tipo | 🟡 | S2.4* | 6 | *El motor genérico puede avanzar con el catálogo provisional; la regla "nivel exigido" espera D-04. Referencia: `lib/reglas.ts`. |
| S2.6 | Bloqueo por UF reprobadas sobre el límite + desbloqueo con motivo auditado | 🛑 | S2.3 | 4 | Bloqueo: D-07 (cuántas UF; DEC-001 punto 5 asume "> 2"). |
| S2.7 | Endpoint "mi file" con verificación de propiedad | 🟡 | S2.2 | 2 | |
| S2.8 | Importación Excel: plantilla, validación por fila, reporte de errores | 🛑 | S2.2 | 6 | Bloqueo: D-13 (volumen, formato de origen). Movible a S3 según el plan. |
| S2.9 | Búsqueda de files conectada | 🟡 | S2.2 | 2 | UI hecha (P-40). Plan: 5 h. |
| S2.10 | Detalle del file + acciones de Kardex conectadas | 🟡 | S2.4 | 3 | UI hecha (P-41, modales). Plan: 6 h. |
| S2.11 | Semáforo y banner de bloqueo | 🟢 | S2.5 | 1 | Hecho (`Semaforo`, `CabeceraFile`). Plan: 3 h. |
| S2.12 | "Mi file" del estudiante conectado | 🟡 | S2.7 | 1 | UI hecha (P-20). Plan: 3 h. |
| S2.13 | Pantalla de carga masiva conectada | 🛑 | S2.8 | 2 | UI simulada hecha (P-46). Bloqueo heredado de D-13. |
| S2.14 | Pruebas: tabla de casos de semáforo y bloqueo, integridad FK, propiedad del file | 🟡 | S2.6 | 5 | PI-06, PI-07, PI-10. Parte de bloqueo espera D-07. |

## Epic C — Hojas de ruta y pases (M3, M5 · Sprint 3)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S3.1 | Tablas hoja_ruta, movimiento_hoja_ruta, pase_derivacion + enum de estados | 🛑 | S2.1 | 4 | Bloqueo: D-05 (estados) y D-21 (tipos de trámite). |
| S3.2 | Correlativo HR-AAAA-NNNNNN por gestión con secuencia y transacción | 🟡 | S3.1 | 3 | Formato fijado en RF-08. |
| S3.3 | Servicio de máquina de estados: transiciones válidas, rol, movimiento, 409 | 🛑 | S3.1 | 6 | Bloqueo: D-05 + DEC-001 (puntos 1–4). Referencia: `lib/transiciones.ts`. **Raíz de M3–M6.** |
| S3.4 | POST /hojas-ruta (ingesta) vinculada a file, rechaza file bloqueado | 🟡 | S3.2, S3.3 | 4 | |
| S3.5 | QR + carátula PDF imprimible | 🟡 | S3.4 | 5 | Carátula HTML hecha (P-32). |
| S3.6 | API de pases: enviar (origen = sede del usuario), bandeja "Por recibir", recibir | 🟡 | S3.3 | 6 | |
| S3.7 | Concurrencia con SELECT … FOR UPDATE | 🟢 | S3.6 | 3 | PI-09. |
| S3.8 | Formulario de ingesta conectado | 🟡 | S3.4 | 3 | UI hecha (P-30). Plan: 6 h. |
| S3.9 | Lista de hojas de ruta con filtros conectada | 🟡 | S3.4 | 2 | UI hecha (P-31). Plan: 4 h. |
| S3.10 | Bandeja de pases conectada | 🟡 | S3.6 | 3 | UI hecha (P-33). Plan: 6 h. |
| S3.11 | Pruebas: transacción de ingesta, transiciones inválidas, recepción doble, sede incorrecta | 🟡 | S3.7 | 6 | PI-02, PI-03, PI-09. |

## Epic D — Tracking y dictamen (M4, RF-13 · Sprint 4)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S4.1 | GET /hojas-ruta/:nro/tracking público (N.º + CI) y autenticado, sin datos sensibles | 🛑 | S3.3 | 4 | Bloqueo: D-08 (¿egresados tienen cuenta? ¿quién la crea?). |
| S4.2 | Rate limit y anti-enumeración en tracking público | 🟢 | S4.1 | 2 | |
| S4.3 | Página pública de tracking conectada | 🟡 | S4.1 | 2 | UI hecha (P-02). Plan: 4 h. |
| S4.4 | Componente Timeline responsivo | 🟢 | S4.1 | 1 | Hecho (`Timeline`). Plan: 6 h. |
| S4.5 | "Mis trámites" del egresado conectado | 🟡 | S4.4 | 2 | UI hecha (P-21). |
| S4.6 | Transiciones de Kardex: tomar, observar (motivo), subsanar | 🛑 | S3.3 | 4 | Bloqueo heredado de D-05. |
| S4.7 | Tabla dictamen + POST /dictamen; rechaza file bloqueado o incompleto | 🛑 | S4.6 | 5 | Bloqueo: D-11 (qué dictamina y valores). |
| S4.8 | Bandeja de revisión de Kardex conectada | 🟡 | S4.6 | 3 | UI hecha (P-43). |
| S4.9 | Dictámenes del Coordinador conectados | 🟡 | S4.7 | 3 | UI hecha (P-50, P-51). |
| S4.10 | E2E Playwright: ingesta → pase → recepción → revisión → dictamen | 🟡 | S4.9 | 8 | Ya existe un guion E2E contra el prototipo (reutilizable). |
| S4.11 | Deuda técnica y correcciones (colchón) | 🟢 | — | 8 | |

## Epic E — Emisión e impresión (M6 · Sprint 5)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S5.1 | Plantillas oficiales HTML/CSS: historial, certificación TCLO, constancia TACFI, copia legalizada | 🛑 | S0.2 | 10 | Bloqueo: D-10 (formatos reales) + D-04 (texto TCLO/TACFI). Borradores en `pages/documentos/Plantillas.tsx`. |
| S5.2 | Servicio PDF (Puppeteer/pdfmake) con navegador headless en caché, < 2 s | 🔴 | S5.1 | 5 | Decisión técnica abierta Puppeteer vs. pdfmake → ADR. |
| S5.3 | Endpoint de vista previa con marca de agua | 🟢 | S5.2 | 2 | |
| S5.4 | Tabla documento_emitido; emisión con valorado; reimpresión con motivo; bloqueo sin dictamen aprobado | 🟡 | S5.2, S4.7 | 5 | |
| S5.5 | Transiciones de retorno: En impresión → … → Entregado | 🛑 | S3.3 | 4 | Bloqueo heredado de D-05. |
| S5.6 | PrintPreviewModal conectado | 🟡 | S5.3 | 3 | UI hecha (P-44). Plan: 6 h. |
| S5.7 | Pantalla SEC_DIR: recepción de retorno, firma y entrega conectada | 🟡 | S5.5 | 2 | UI hecha (P-34). Plan: 5 h. |
| S5.8 | Pruebas: PDF con datos largos, tiempo de generación, emisión sin dictamen rechazada | 🟡 | S5.4 | 5 | PI-04. |
| S5.9 | Revisión de plantillas en papel real con Kardex | 🛑 | S5.6 | 3 | Bloqueo: D-10. |

## Epic F — Reportes, auditoría, calidad y Go-Live (M7 · Sprint 6)

| ID | Tarea | Tier | Depende de | Horas | Notas |
|---|---|---|---|---:|---|
| S6.1 | Consultas KPI + índices | 🛑 | S3.1 | 5 | Bloqueo: D-20 (KPIs exactos y línea base). Propuesta ya visible en P-60. |
| S6.2 | Dashboard de reportes conectado | 🟡 | S6.1 | 3 | UI hecha (P-60). Plan: 6 h. |
| S6.3 | Exportación PDF y Excel | 🟡 | S6.1 | 4 | |
| S6.4 | Cobertura de bitácora en acciones críticas + bloquear UPDATE/DELETE en log_auditoria (permisos BD) | 🟡 | S1.7 | 4 | PI-05. |
| S6.5 | Grilla de bitácora conectada | 🟡 | S6.4 | 2 | UI hecha (P-48). |
| S6.6 | Prueba de carga k6: 50 usuarios, p95 < 2 s | 🟢 | S6.1 | 5 | RNF-04. |
| S6.7 | Revisión de seguridad OWASP básica + npm audit | 🟢 | — | 5 | |
| S6.8 | Compatibilidad: 4 navegadores, 360 px y escritorio | 🟢 | — | 3 | El prototipo ya se revisó a 360 px. |
| S6.9 | UAT con los 6 roles y acta firmada | 🛑 | S6.8 | 4 | Bloqueo: D-16 (quién firma). |
| S6.10 | Producción: servidor, dominio, TLS, respaldo diario + restauración probada | 🛑 | — | 5 | Bloqueo: D-12 (dónde se aloja). RNF-11. |
| S6.11 | Migración de datos reales y verificación con Kardex | 🛑 | S2.8 | 4 | Bloqueo: D-13. |
| S6.12 | Manual de usuario por rol + capacitación | 🟡 | S6.9 | 6 | |
| S6.13 | Go-Live (18-ene-2027 según opción A) + soporte primera semana | 🛑 | S6.10 | 3 | Bloqueo: D-06 (fecha y alcance). |

---

## Preguntas abiertas

Horas = las de la Ola 3 del roadmap que cuelgan de cada duda (directo + cascada), calculadas desde la tabla de [2026-10-12 - Sprint-Roadmap.md](2026-10-12%20-%20Sprint-Roadmap.md). Todas ya existen en `docs/product/dudas.md`; no hay preguntas nuevas de stakeholder. La única decisión nueva es técnica (S5.2 Puppeteer vs. pdfmake → ADR).

1. **¿Cuáles son los estados válidos del trámite y quién mueve cada paso? ¿Se aceptan las interpretaciones de DEC-001?** `D-05` — 66 h (16 tareas): Epics C y D casi enteros + retorno. **La de mayor apalancamiento**; el prototipo permite validarla en la demo.
2. **¿Qué son TACFI y TCLO, qué nivel se exige, hay otros requisitos y cuáles son los formatos oficiales?** `D-04`, `D-18`, `D-10` — 42 h (11 tareas): requisitos del file + toda la emisión.
3. **¿Quién es Product Owner y quién firma el UAT?** `D-16` — 25 h.
4. **¿Qué KPIs quiere el Coordinador y existe línea base?** `D-20` — 17 h.
5. **¿Resultado anual + n.º de UF reprobadas o nota por UF? ¿Con cuántas se bloquea?** `D-07` — 13 h.
6. **¿Cuántos files históricos hay y en qué formato?** `D-13` — 12 h.
7. **¿Los egresados tendrán cuenta? ¿Quién la crea?** `D-08` — 11 h.
8. **¿El dictamen es Aprobado/Observado y solo para egresados?** `D-11` — 8 h.
9. **¿Dónde se aloja el sistema y con qué dominio?** `D-12` — 5 h + Go-Live.
10. **¿El Go-Live de noviembre es para la defensa o para producción? (opción A/B/C)** `D-06` — decisión de alcance (Ola 4): reordena las olas.
