# SISET — Roadmap de sprint

> **Reemplazado** por [2026-10-13 - Sprint-Roadmap.md](2026-10-13%20-%20Sprint-Roadmap.md) (DEC-009, piloto de noviembre). Se conserva como registro.

**Fecha:** 2026-10-12 · **Repo:** `5c2e185` (main) · **Backlog:** [2026-10-12 - Backlog-Epics-Tasks.md](2026-10-12%20-%20Backlog-Epics-Tasks.md) · **Board del tracker revisado:** sí — ClickUp "FRANZ's Space": no existía lista de SISET (solo "Mi proyecto", de beta-ia). Se creó la lista **SISET** (`901115543466`) con los 7 tickets de la Ola 1.

**Contexto de fechas:** hoy arranca el Sprint 0 del plan (12–16 oct 2026). El Go-Live de referencia es 18-ene-2027 (opción A de D-06, sin confirmar).

## 1 · Dónde estamos

Fuente: el repo. Hay un prototipo navegable completo (`apps/web`, 27 pantallas con datos en memoria) y **ningún backend** (`apps/api` no existe). Ninguna tarea del plan está terminada según la DoD del PRD §6 (exige API, pruebas y staging), pero la UI de casi todas las tareas FE ya está construida.

| Estado | Horas | Tareas | % horas |
|---|---:|---:|---:|
| ✅ Listo (DoD completa) | 0 | 0 | 0 % |
| 🟡 UI hecha en prototipo, falta API | 49 | 22 | 15 % |
| ⬜ Pendiente (desbloqueado) | 101 | 24 | 31 % |
| ⛔ Bloqueado por stakeholder (Registro de Dudas) | 172 | 40 | 53 % |
| **Total** | **322** | **86** | |

Por ola: **Ola 1 = 24 h**, **Ola 2 = 96 h**, **Ola 3 = 202 h** (incluye 12 tareas 🟡 cuya API espera una duda).

Las horas de las 22 tareas FE ya están reducidas por lo que cubre el prototipo: el plan original suma 378 h; este roadmap, 322 h (−56 h).

**Discrepancias con el plan original:** el plan calcula S0.8 (5 h), S1.11 (4 h), S2.11 (3 h) y S4.4 (6 h) desde cero; el repo ya las tiene casi resueltas. El ahorro total (56 h, casi un sprint) puede absorber parte del riesgo de calendario R1.

## 2 · Prioridades — cuatro olas

### Ola 1 — llave/barata · ahora · sin stakeholder (24 h, 7 tareas)

Todo el backend cuelga de aquí. Se puede terminar dentro del Sprint 0 (31 h de capacidad).

- **S0.1** Demo del prototipo + cerrar dudas bloqueantes (3 h). *Llave de la Ola 3: es la reunión que destraba 202 h.*
- **S0.3** Monorepo + `apps/api` + ESLint/Prettier/Husky (3 h). *Llave: S0.4, S0.5, S0.7, S0.8 dependen de esta (4 de 7 tareas del Epic 0).*
- **S0.4** Docker Compose con PostgreSQL 16 (4 h).
- **S0.6** Esquema Prisma inicial + seed (4 h). *Llave: todo el backend (Epics A–F) cuelga de esta tabla base.*
- **S0.7** Base del API por capas (5 h). *Llave de todos los endpoints.*
- **S0.5** CI en GitHub Actions (3 h). *Habilita la DoD ("pruebas pasan en CI").*
- **S0.8** Cliente Axios + interruptor mock/API en `src/services/` (2 h). *Llave de las 22 tareas 🟡 "conectar a la API".*

### Ola 2 — volumen · sigue · sin stakeholder (96 h)

Paralelizable una vez que la Ola 1 esté hecha. Cubre el Sprint 1 completo y la parte de S2 que no depende de D-04/D-07.

- **Staging:** S0.9 (provisional en VPS propio).
- **Seguridad y RBAC (Sprint 1 entero, 48 h):** S1.1–S1.14. D-14 (CI como usuario) y D-17 (bitácora desde la API) quedan con la propuesta provisional; riesgo bajo.
- **File académico, parte sin bloqueo (23 h):** S2.1 (tablas + catálogo parametrizable), S2.2, S2.5 (motor genérico), S2.7, S2.9, S2.11, S2.12.
- **Transversal:** S6.4 (bitácora inmutable, se puede adelantar), S6.7 y S6.8 (revisiones continuas), S4.11 (colchón).

### Ola 3 — esperando a un stakeholder · bloqueado (202 h)

Ordenado por apalancamiento: horas de la Ola 3 que cuelgan de cada duda (directo + en cascada, calculado desde la tabla §3).

1. **D-05 Estados del trámite** → 66 h, 16 tareas (S3.*, S4.1–S4.10 salvo dictamen, S5.5, S5.7). Se valida en la demo con el prototipo y DEC-001.
2. **D-10 + D-04 Plantillas oficiales y TACFI/TCLO** → 42 h, 11 tareas (S0.2, S2.4, S2.10, S5.1–S5.9 salvo S5.5/S5.7).
3. **D-16 Equipo Scrum / PO** → 25 h (reviews S1.15…S5.10, S6.9, S6.12).
4. **D-20 KPIs y línea base** → 17 h (S6.1–S6.3, S6.6).
5. **D-07 Regla de notas** → 13 h (S2.3, S2.6, S2.14).
6. **D-13 Migración de files** → 12 h (S2.8, S2.13, S6.11).
7. **D-08 Acceso del egresado** → 11 h (S4.1–S4.5).
8. **D-11 Dictamen** → 8 h (S4.7, S4.9).
9. **D-12 Infraestructura** → 5 h directo (S6.10) + Go-Live.
10. **D-06 Fecha de Go-Live** → 3 h directo (S6.13), pero reordena todo (ver Ola 4).

### Ola 4 — decisiones de alcance (sin costo de build)

- **D-06**: ¿Go-Live en noviembre para la defensa (opción B, piloto M1 + M2 parcial) o producción el 18-ene-2027 (opción A)? Esto cambia qué entra en cada ola.
- **D-03 MFA**: fuera de v1.0 (confirmar y sacarlo de CPA-01).
- **D-19 notificaciones** y **D-22 escaneos**: confirmar que van a v1.1.
- **D-09**: hoja de ruta digital solo para egresados en v1.0.
- **D-01 / D-02**: confirmar formalmente React + Node + PostgreSQL + Prisma (el prototipo ya lo asume).
- **D-15**: 2 sedes, Kardex en Ancocagua.
- **D-23**: alinear la tesis con el plan real (no bloquea código).
- *Técnica, no de stakeholder:* S5.2 Puppeteer vs. pdfmake → ADR antes del Sprint 5.

## 3 · Listado de tareas

Tamaño en horas. Estado: ⬜ pendiente · 🟡 UI en prototipo, falta API · ⛔ bloqueado. Fuente: PRD §, RF o pantalla del spec.

| ID | Módulo | Tarea | Tamaño | Estado | Ola | Ticket | Fuente | Depende de | Bloqueo |
|---|---|---|---:|---|---|---|---|---|---|
| S0.1 | Negocio | Demo del prototipo + cerrar dudas bloqueantes | 3 | ⬜ | 1 | [868mgh27v](https://app.clickup.com/t/868mgh27v) | dudas.md | — | — |
| S0.3 | Entorno | Monorepo + apps/api + lint/format/Husky | 3 | ⬜ | 1 | [868mgh27z](https://app.clickup.com/t/868mgh27z) | RNF-07 | — | — |
| S0.4 | Entorno | Docker Compose (PG16, API, web, Nginx) | 4 | ⬜ | 1 | [868mgh284](https://app.clickup.com/t/868mgh284) | PRD §5 | S0.3 | — |
| S0.5 | Entorno | CI GitHub Actions | 3 | ⬜ | 1 | [868mgh285](https://app.clickup.com/t/868mgh285) | DoD | S0.3 | — |
| S0.6 | Entorno | Prisma inicial + seed | 4 | ⬜ | 1 | [868mgh287](https://app.clickup.com/t/868mgh287) | PRD §5 | S0.4 | — |
| S0.7 | Entorno | Base del API por capas | 5 | ⬜ | 1 | [868mgh289](https://app.clickup.com/t/868mgh289) | RNF-07, RNF-10 | S0.3 | — |
| S0.8 | Entorno | Axios + interruptor mock/API | 2 | 🟡 | 1 | [868mgh28b](https://app.clickup.com/t/868mgh28b) | spec §1 | S0.3 | — |
| S0.9 | Entorno | Staging HTTPS (provisional) | 3 | ⬜ | 2 | | D-12 | S0.4 | — |
| S0.2 | Negocio | Plantillas oficiales y hoja de ruta física | 1 | ⛔ | 3 | | D-10 | S0.1 | D-10 |
| S1.1 | Seguridad | refresh_token + campos de bloqueo | 2 | ⬜ | 2 | | RF-01 | S0.6 | — |
| S1.2 | Seguridad | bcrypt + política de contraseña | 2 | ⬜ | 2 | | RNF-01 | S0.7 | — |
| S1.3 | Seguridad | POST /auth/login | 6 | ⬜ | 2 | | RF-01 | S1.1, S1.2 | — |
| S1.4 | Seguridad | Bloqueo 5 intentos + rate limit | 3 | ⬜ | 2 | | RF-01, RNF-10 | S1.3 | — |
| S1.5 | Seguridad | refresh (rotación) + logout | 4 | ⬜ | 2 | | RF-01 | S1.3 | — |
| S1.6 | Seguridad | authenticate/authorize/propiedad | 5 | ⬜ | 2 | | RF-02 | S1.3 | — |
| S1.7 | Auditoría | audit.log() transaccional | 3 | ⬜ | 2 | | RF-14, D-17 | S0.6 | — |
| S1.8 | Usuarios | CRUD /usuarios | 6 | ⬜ | 2 | | RF-03 | S1.6 | — |
| S1.9 | Seguridad | Login + cambio de clave conectados | 2 | 🟡 | 2 | | P-01, P-03 | S1.3, S0.8 | — |
| S1.10 | Seguridad | Sesión real, refresh, inactividad | 4 | 🟡 | 2 | | RNF-02 | S1.5, S0.8 | — |
| S1.11 | Seguridad | Rutas por rol, sidebar, 403 | 1 | 🟡 | 2 | | RF-02 | S1.10 | — |
| S1.12 | Inicio | Inicios por rol | 1 | 🟡 | 2 | | P-10..P-15 | S1.11 | — |
| S1.13 | Usuarios | Módulo de usuarios conectado | 3 | 🟡 | 2 | | P-47 | S1.8 | — |
| S1.14 | QA | Pruebas auth + 403 + URL directa | 6 | ⬜ | 2 | | PI-01, CPA-01 | S1.6 | — |
| S1.15 | Negocio | Review S1 + retro | 3 | ⛔ | 3 | | — | — | D-16 |
| S2.1 | File | Tablas del file + catálogo | 5 | ⬜ | 2 | | PRD §5 | S0.6 | — |
| S2.2 | File | API de files con paginación | 6 | ⬜ | 2 | | RF-04 | S2.1, S1.6 | — |
| S2.3 | File | API matrículas y resultados | 4 | ⛔ | 3 | | RF-04 | S2.1 | D-07 |
| S2.4 | File | API de requisitos TACFI/TCLO/notas | 5 | ⛔ | 3 | | RF-05, RF-06 | S2.1 | D-04, D-18 |
| S2.5 | File | Motor de semáforo parametrizado | 6 | ⬜ | 2 | | RF-07 | S2.1 | parcial D-04 |
| S2.6 | File | Bloqueo por UF + desbloqueo auditado | 4 | ⛔ | 3 | | RF-07 | S2.3 | D-07 |
| S2.7 | File | Endpoint "mi file" | 2 | ⬜ | 2 | | RF-04 | S2.2 | — |
| S2.8 | File | Importación Excel | 6 | ⛔ | 3 | | D-13 | S2.2 | D-13 |
| S2.9 | File | Búsqueda de files conectada | 2 | 🟡 | 2 | | P-40 | S2.2 | — |
| S2.10 | File | Detalle del file conectado | 3 | 🟡 | 3 | | P-41 | S2.4 | D-04 (heredado) |
| S2.11 | File | Semáforo + banner de bloqueo | 1 | 🟡 | 2 | | P-41 | S2.5 | — |
| S2.12 | File | "Mi file" conectado | 1 | 🟡 | 2 | | P-20 | S2.7 | — |
| S2.13 | File | Carga masiva conectada | 2 | ⛔ | 3 | | P-46 | S2.8 | D-13 |
| S2.14 | QA | Pruebas semáforo/bloqueo/FK/propiedad | 5 | ⛔ | 3 | | PI-06, PI-07, PI-10 | S2.6 | D-07 (heredado) |
| S2.15 | Negocio | Review S2 + retro | 3 | ⛔ | 3 | | — | — | D-16 |
| S3.1 | Hojas de ruta | Tablas HR, movimientos, pases | 4 | ⛔ | 3 | | PRD §5 | S2.1 | D-05, D-21 |
| S3.2 | Hojas de ruta | Correlativo HR-AAAA-NNNNNN | 3 | ⛔ | 3 | | RF-08 | S3.1 | D-05 (heredado) |
| S3.3 | Hojas de ruta | Máquina de estados + 409 | 6 | ⛔ | 3 | | PRD §3 | S3.1 | D-05 |
| S3.4 | Hojas de ruta | POST /hojas-ruta | 4 | ⛔ | 3 | | RF-08 | S3.2, S3.3 | D-05 (heredado) |
| S3.5 | Hojas de ruta | QR + carátula PDF | 5 | ⛔ | 3 | | RF-08 | S3.4 | D-05 (heredado) |
| S3.6 | Pases | API de pases | 6 | ⛔ | 3 | | RF-10 | S3.3 | D-05 (heredado) |
| S3.7 | Pases | SELECT … FOR UPDATE | 3 | ⛔ | 3 | | PI-09 | S3.6 | D-05 (heredado) |
| S3.8 | Hojas de ruta | Ingesta conectada | 3 | 🟡 | 3 | | P-30 | S3.4 | D-05 (heredado) |
| S3.9 | Hojas de ruta | Lista con filtros conectada | 2 | 🟡 | 3 | | P-31 | S3.4 | D-05 (heredado) |
| S3.10 | Pases | Bandeja de pases conectada | 3 | 🟡 | 3 | | P-33 | S3.6 | D-05 (heredado) |
| S3.11 | QA | Pruebas de ingesta y pases | 6 | ⛔ | 3 | | PI-02, PI-03, PI-09 | S3.7 | D-05 (heredado) |
| S3.12 | Negocio | Review S3 con Secretarías | 3 | ⛔ | 3 | | — | — | D-16 |
| S4.1 | Tracking | GET tracking público/autenticado | 4 | ⛔ | 3 | | RF-09 | S3.3 | D-08 |
| S4.2 | Tracking | Rate limit + anti-enumeración | 2 | ⛔ | 3 | | RNF-10 | S4.1 | D-08 (heredado) |
| S4.3 | Tracking | Página pública conectada | 2 | 🟡 | 3 | | P-02 | S4.1 | D-08 (heredado) |
| S4.4 | Tracking | Timeline | 1 | 🟡 | 3 | | HU-06 | S4.1 | D-08 (heredado) |
| S4.5 | Tracking | "Mis trámites" conectado | 2 | 🟡 | 3 | | P-21 | S4.4 | D-08 (heredado) |
| S4.6 | Revisión | Tomar / observar / subsanar | 4 | ⛔ | 3 | | HU-14 | S3.3 | D-05 |
| S4.7 | Dictamen | Tabla + POST dictamen | 5 | ⛔ | 3 | | RF-13 | S4.6 | D-11 |
| S4.8 | Revisión | Bandeja de revisión conectada | 3 | 🟡 | 3 | | P-43 | S4.6 | D-05 (heredado) |
| S4.9 | Dictamen | Dictámenes conectados | 3 | 🟡 | 3 | | P-50, P-51 | S4.7 | D-11 (heredado) |
| S4.10 | QA | E2E Playwright del flujo | 8 | ⛔ | 3 | | PI-03 | S4.9 | D-05 (heredado) |
| S4.11 | — | Deuda técnica (colchón) | 8 | ⬜ | 2 | | — | — | — |
| S4.12 | Negocio | Review S4 | 3 | ⛔ | 3 | | — | — | D-16 |
| S5.1 | Emisión | Plantillas oficiales HTML/CSS | 10 | ⛔ | 3 | | RF-12 | S0.2 | D-10, D-04 |
| S5.2 | Emisión | Servicio PDF < 2 s | 5 | ⛔ | 3 | | RF-11, PI-04 | S5.1 | ADR + D-10 (heredado) |
| S5.3 | Emisión | Vista previa con marca de agua | 2 | ⛔ | 3 | | RF-11 | S5.2 | heredado |
| S5.4 | Emisión | documento_emitido + reimpresión | 5 | ⛔ | 3 | | RF-12 | S5.2, S4.7 | heredado |
| S5.5 | Retorno | Transiciones de retorno | 4 | ⛔ | 3 | | PRD §3 | S3.3 | D-05 |
| S5.6 | Emisión | PrintPreviewModal conectado | 3 | 🟡 | 3 | | P-44 | S5.3 | heredado |
| S5.7 | Retorno | Firma y entrega conectada | 2 | 🟡 | 3 | | P-34 | S5.5 | D-05 (heredado) |
| S5.8 | QA | Pruebas de PDF y emisión | 5 | ⛔ | 3 | | PI-04 | S5.4 | heredado |
| S5.9 | Negocio | Plantillas en papel real | 3 | ⛔ | 3 | | D-10 | S5.6 | D-10 |
| S5.10 | Negocio | Review S5 | 3 | ⛔ | 3 | | — | — | D-16 |
| S6.1 | Reportes | Consultas KPI + índices | 5 | ⛔ | 3 | | RF-13, PI-08 | S3.1 | D-20 |
| S6.2 | Reportes | Dashboard conectado | 3 | 🟡 | 3 | | P-60 | S6.1 | D-20 (heredado) |
| S6.3 | Reportes | Exportación PDF/Excel | 4 | ⛔ | 3 | | RF-13 | S6.1 | D-20 (heredado) |
| S6.4 | Auditoría | Bitácora inmutable + cobertura | 4 | ⬜ | 2 | | RF-14, PI-05 | S1.7 | — |
| S6.5 | Auditoría | Grilla de bitácora conectada | 2 | 🟡 | 2 | | P-48 | S6.4 | — |
| S6.6 | QA | Carga k6 (50 usuarios, p95 < 2 s) | 5 | ⛔ | 3 | | RNF-04 | S6.1 | heredado |
| S6.7 | QA | Revisión de seguridad OWASP | 5 | ⬜ | 2 | | — | — | — |
| S6.8 | QA | Compatibilidad navegadores / 360 px | 3 | ⬜ | 2 | | RNF-05, RNF-08 | — | — |
| S6.9 | Negocio | UAT con acta firmada | 4 | ⛔ | 3 | | CPA-01 | S6.8 | D-16 |
| S6.10 | DevOps | Producción + respaldos | 5 | ⛔ | 3 | | RNF-11 | — | D-12 |
| S6.11 | Datos | Migración de datos reales | 4 | ⛔ | 3 | | D-13 | S2.8 | D-13 |
| S6.12 | Doc | Manual por rol + capacitación | 6 | ⛔ | 3 | | — | S6.9 | heredado D-16 |
| S6.13 | DevOps | Go-Live + soporte | 3 | ⛔ | 3 | | — | S6.10 | D-06, D-12 |

**El board del tracker no es la verdad.** Los estados de esta tabla salen del
repo, no del board — ver discrepancias anotadas en §1.

## 4 · Qué preguntarle al stakeholder ahora

Para la reunión S0.1 (demo del prototipo con Kardex y Coordinación), en este orden. **Las dos primeras valen más que todas las demás juntas**: 108 h de las 202 h bloqueadas.

1. **¿Estos son los estados y los pasos reales del trámite? ¿Aceptan las 4 interpretaciones de DEC-001?** `D-05` — *desbloquea 66 h (16 tareas).* Mostrarlo con el flujo completo del prototipo.
2. **¿Qué son exactamente TACFI y TCLO, qué nivel de TCLO se exige, y pueden darnos los formatos reales (papel, valorado, firmas)?** `D-04`, `D-18`, `D-10` — *42 h (11 tareas).*
3. **¿Quién es Product Owner y firma el UAT?** `D-16` — *25 h.*
4. **¿Qué indicadores quiere el Coordinador y hay registro actual de tiempos?** `D-20` — *17 h.*
5. **¿Resultado anual + n.º de UF reprobadas, o nota por UF? ¿Con cuántas se bloquea?** `D-07` — *13 h.*
6. **¿Cuántos files históricos hay y en qué formato?** `D-13` — *12 h.*
7. **¿Go-Live para la defensa en noviembre o para producción en enero?** `D-06` — *decisión de alcance: reordena las olas.*
