PLAN SCRUM

Plan de Sprints y Tareas

SISET — 7 sprints, 12 oct 2026 a 18 ene 2027


| Proyecto | SISET — Sistema de Gestión y Seguimiento de Trámites |
|---|---|
| Institución | ESFM "Mcal. Andrés de Santa Cruz y Calahumana" — UA Ancocagua |
| Autor | Franz Jhonny Yapu Mamani |
| Fecha | 11 de octubre de 2026 |
| Versión | 1.0 — borrador para implementación |
| Documentos asociados | PRD · Registro de Dudas |


Contenido

1. Calendario	3

2. Supuestos, ceremonias y convenciones	3

3. Sprint 0 — Fundaciones y cierre de dudas (12–16 oct 2026)	4

4. Sprint 1 — Seguridad y RBAC (19–30 oct 2026)	5

5. Sprint 2 — File académico y reglas de negocio (2–13 nov 2026)	6

6. Sprint 3 — Ingesta de hojas de ruta y pases entre sedes (16–27 nov 2026)	7

7. Sprint 4 — Tracking y dictamen (30 nov – 11 dic 2026)	8

8. Sprint 5 — Emisión e impresión en Kardex (14–23 dic 2026)	8

9. Sprint 6 — Reportes, auditoría, pruebas y Go-Live (4–15 ene 2027)	9

Siete sprints (uno de 1 semana y seis de 2 semanas) llevan SISET de cero a producción en 13 semanas; cada tarea referencia el requisito del PRD que cumple.


# 1. Calendario

Figura 1. Calendario de sprints, 12 oct 2026 a 18 ene 2027

Con el alcance completo y una sola persona, el Go-Live cae el 18 de enero de 2027; la fecha del borrador (primera semana de noviembre) solo alcanzaría para S0 y S1. La decisión está en D-06.


| Sprint | Fechas | Objetivo | Puntos | Horas |
|---|---|---|---|---|
| S0 | 12–16 oct 2026 | Fundaciones y cierre de dudas | — | 31 |
| S1 | 19–30 oct 2026 | Seguridad y RBAC | 13 | 61 |
| S2 | 2–13 nov 2026 | File académico y reglas de negocio | 16 | 66 |
| S3 | 16–27 nov 2026 | Ingesta de hojas de ruta y pases | 13 | 56 |
| S4 | 30 nov – 11 dic 2026 | Tracking y dictamen | 11 | 58 |
| S5 | 14–23 dic 2026 | Emisión e impresión en Kardex | 13 | 48 |
| S6 | 4–15 ene 2027 | Reportes, auditoría, pruebas y Go-Live | 13 | 58 |


# 2. Supuestos, ceremonias y convenciones

El plan asume 1 desarrollador full stack con unas 30 h productivas por semana (60 h por sprint de 2 semanas); con más personas, los sprints se acortan.

Roles Scrum (por confirmar en D-16)


| Rol | Quién | Responsabilidad |
|---|---|---|
| Product Owner | Responsable de Archivo Kardex o Coordinador Académico | Prioriza el backlog, acepta o rechaza historias |
| Scrum Master | Por definir (puede ser el tutor o el propio desarrollador) | Facilita ceremonias, remueve bloqueos |
| Equipo de desarrollo | Desarrollador full stack | Construye, prueba y despliega |

Ceremonias


| Ceremonia | Cuándo | Duración | Salida |
|---|---|---|---|
| Sprint Planning | Lunes del inicio de sprint | 1 h | Sprint Backlog comprometido |
| Daily | Cada día laboral (si hay equipo) o bitácora diaria escrita (si es 1 persona) | 15 min | Avance y bloqueos |
| Sprint Review | Último viernes del sprint | 1 h | Demo en staging a usuarios reales de Kardex y Secretaría |
| Retrospectiva | Tras la Review | 30 min | 1–2 acciones de mejora |
| Refinamiento | Mitad de sprint | 45 min | Historias del siguiente sprint listas (Definition of Ready) |

Convenciones de tareas

- ID Sx.y = sprint x, tarea y. Tipos: DB, BE (backend), FE (frontend), QA, DevOps, Doc, Neg (negocio/validación).
- Estimación en horas ideales; las historias (HU) llevan puntos Fibonacci.
- Rama por tarea: feat/S1.4-login; commit con el ID: S1.4 implementa login.
- Una tarea está hecha cuando cumple la Definición de Terminado del PRD (sección 6).
- Velocidad objetivo: ~20 puntos por sprint; se recalcula tras el Sprint 1.

# 3. Sprint 0 — Fundaciones y cierre de dudas (12–16 oct 2026)

Objetivo: reglas de negocio confirmadas y un esqueleto desplegado en staging, con CI en verde.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S0.1 | Reunión con Kardex y Coordinación para cerrar dudas bloqueantes (D-01, D-04, D-05, D-07, D-08) | Neg | 3 | — | Registro de dudas |
| S0.2 | Conseguir plantillas oficiales de documentos y ejemplo de hoja de ruta física | Neg | 1 | S0.1 | D-10 |
| S0.3 | Crear monorepo (apps/web, apps/api), ESLint, Prettier, TypeScript estricto, Husky | DevOps | 3 | — | RNF-07 |
| S0.4 | Docker Compose: PostgreSQL 16, API, web, Nginx | DevOps | 4 | S0.3 | — |
| S0.5 | Pipeline CI (GitHub Actions): lint, tests, build | DevOps | 3 | S0.3 | DoD |
| S0.6 | Esquema Prisma inicial: rol, usuario, sede, especialidad, log_auditoria; migración y seed de 6 roles y 2 sedes | DB | 4 | S0.4 | PRD §5 |
| S0.7 | Base del API: estructura por capas, manejo de errores estándar, logger, Zod, Helmet, CORS, Swagger | BE | 5 | S0.3 | RNF-10 |
| S0.8 | Base del frontend: Vite + Tailwind, router, layout (header, sidebar, contenido), cliente Axios, tema de colores institucional | FE | 5 | S0.3 | Modelo de presentación |
| S0.9 | Entorno staging en servidor con HTTPS | DevOps | 3 | S0.4 | D-12 |

Total: 31 h. Entregable: página de inicio en staging y CI en verde.


# 4. Sprint 1 — Seguridad y RBAC (19–30 oct 2026)

Objetivo: los 6 roles inician sesión y ven solo su menú; Kardex administra usuarios.

Historias: HU-01 Autenticación institucional (5 pts) · HU-02 Espacios de navegación por rol (3 pts) · HU-11 Gestión de usuarios (5 pts, nueva). Total: 13 pts.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S1.1 | Tabla refresh_token y campos de bloqueo en usuario (intentos_fallidos, bloqueado_hasta, debe_cambiar_password) | DB | 2 | S0.6 | RF-01 |
| S1.2 | Servicio de hash bcrypt (costo 12) y política de contraseña (mín. 8, letras y números) | BE | 2 | S0.7 | RNF-01 |
| S1.3 | POST /auth/login: validación, access JWT 15 min, refresh en cookie httpOnly | BE | 6 | S1.1, S1.2 | RF-01 |
| S1.4 | Bloqueo tras 5 intentos fallidos por 15 min + rate limit 10/min por IP | BE | 3 | S1.3 | RF-01, RNF-10 |
| S1.5 | POST /auth/refresh (rotación) y /auth/logout (revocación) | BE | 4 | S1.3 | RF-01 |
| S1.6 | Middleware authenticate y authorize(roles); helper de propiedad ("solo lo propio") | BE | 5 | S1.3 | RF-02 |
| S1.7 | Servicio de auditoría audit.log() llamado en login, logout y fallos | BE | 3 | S0.6 | RF-14 |
| S1.8 | CRUD /usuarios: crear, editar, baja lógica, reactivar, resetear contraseña | BE | 6 | S1.6 | RF-03 |
| S1.9 | Pantalla de login (CI + contraseña, spinner, errores) y cambio obligatorio de contraseña | FE | 5 | S1.3 | CU-01 |
| S1.10 | Contexto de sesión, refresh automático en Axios, cierre por inactividad de 15 min | FE | 4 | S1.5 | RNF-02 |
| S1.11 | Rutas protegidas por rol, sidebar dinámico, vista 403 (AccessDeniedView) | FE | 4 | S1.10 | RF-02 |
| S1.12 | Paneles de inicio vacíos por rol (6 dashboards placeholder) | FE | 2 | S1.11 | Modelo de navegación |
| S1.13 | Módulo de usuarios: tabla con búsqueda, formulario, confirmaciones | FE | 6 | S1.8 | RF-03 |
| S1.14 | Pruebas: unitarias de auth, API con Supertest (login ok/fallido/bloqueo, 403 por rol, acceso por URL directa) | QA | 6 | S1.6 | PI-01, CPA-01 |
| S1.15 | Review con usuarios + retrospectiva + refinamiento del Sprint 2 | Neg | 3 | — | — |

Total: 61 h. Demo: cada rol entra y ve su panel; un estudiante que escribe la URL de Kardex recibe 403.


# 5. Sprint 2 — File académico y reglas de negocio (2–13 nov 2026)

Objetivo: Kardex registra files y requisitos; el sistema calcula el semáforo y bloquea por UF reprobadas.

Historias: HU-03 Registro y consulta de file (8 pts) · HU-04 Alertas de requisitos TACFI/TCLO (3 pts) · HU-12 Carga masiva de files históricos (5 pts, nueva). Total: 16 pts.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S2.1 | Tablas file_academico, matricula, resultado_anual, requisito_tipo, requisito_file + índices; seed del catálogo de requisitos | DB | 5 | S0.1 | PRD §5, D-04 |
| S2.2 | API de files: crear, editar, buscar (CI, nombre, código, especialidad, año) con paginación de servidor | BE | 6 | S2.1 | RF-04 |
| S2.3 | API de matrículas y resultados anuales (Aprobado/Reprobado + n.º de UF reprobadas) | BE | 4 | S2.1 | RF-04, D-07 |
| S2.4 | API de requisitos: registrar TACFI (recepción física), TCLO (nivel, n.º certificado), certificado de notas | BE | 5 | S2.1 | RF-05, RF-06 |
| S2.5 | Motor de reglas: cálculo de semáforo por requisito y global, parametrizado desde requisito_tipo | BE | 6 | S2.4 | RF-07, R4 |
| S2.6 | Regla de bloqueo por UF reprobadas sobre el límite + desbloqueo con motivo (auditado) | BE | 4 | S2.3 | RF-07, PI-10 |
| S2.7 | Endpoint "mi file" para ESTUDIANTE/EGRESADO con verificación de propiedad | BE | 2 | S2.2 | RF-04 |
| S2.8 | Importación desde Excel con plantilla, validación fila por fila y reporte de errores | BE | 6 | S2.2 | D-13 |
| S2.9 | Pantalla de búsqueda de files (AcademicRecordTable) | FE | 5 | S2.2 | CU-03 |
| S2.10 | Detalle del file: matrículas, resultados, requisitos y acciones de Kardex | FE | 6 | S2.4 | CU-03, CU-08, CU-09 |
| S2.11 | Componente semáforo (AlertBadgePanel) y banner de bloqueo | FE | 3 | S2.5 | CU-04 |
| S2.12 | Vista "Mi file" del estudiante (solo lectura, móvil primero) | FE | 3 | S2.7 | RF-04, RNF-05 |
| S2.13 | Pantalla de carga masiva con vista previa de errores | FE | 3 | S2.8 | D-13 |
| S2.14 | Pruebas: reglas de semáforo y bloqueo (tabla de casos), integridad FK (PI-06), propiedad del file | QA | 5 | S2.6 | PI-06, PI-07, PI-10 |
| S2.15 | Review + retro + refinamiento | Neg | 3 | — | — |

Total: 66 h (ligeramente sobre capacidad: si hace falta, S2.8 y S2.13 pasan al Sprint 3). Demo: un estudiante con una UF reprobada sobre el límite aparece en rojo y bloqueado.


# 6. Sprint 3 — Ingesta de hojas de ruta y pases entre sedes (16–27 nov 2026)

Objetivo: La Paz registra un trámite con QR y lo envía a Ancocagua, que confirma la recepción.

Historias: HU-05 Ingesta de hojas de ruta y QR (5 pts) · HU-07 Control de pases entre sedes (8 pts). Total: 13 pts.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S3.1 | Tablas hoja_ruta, movimiento_hoja_ruta, pase_derivacion; enum de estados (PRD §3) | DB | 4 | S2.1 | D-05 |
| S3.2 | Generador de correlativo por gestión (HR-AAAA-NNNNNN) con secuencia y transacción | BE | 3 | S3.1 | RF-08, PI-02 |
| S3.3 | Servicio de máquina de estados: transiciones válidas, rol autorizado, registro en movimiento_hoja_ruta, error 409 si no es válida | BE | 6 | S3.1 | PRD §3 |
| S3.4 | POST /hojas-ruta (ingesta) vinculada a file, con validación de file bloqueado | BE | 4 | S3.2, S3.3 | RF-08 |
| S3.5 | Generación de QR (URL de tracking) y carátula PDF imprimible de la hoja de ruta | BE | 5 | S3.4 | RF-08 |
| S3.6 | API de pases: enviar (origen = sede del usuario), bandeja "Por recibir", confirmar recepción | BE | 6 | S3.3 | RF-10 |
| S3.7 | Control de concurrencia con SELECT … FOR UPDATE al cambiar estado | BE | 3 | S3.6 | PI-09 |
| S3.8 | Formulario de ingesta (IngestForm) con autocompletado por CI | FE | 6 | S3.4 | CU-05 |
| S3.9 | Lista de hojas de ruta por sede con filtros por estado y fecha | FE | 4 | S3.4 | — |
| S3.10 | Panel de pases (TransferControlPanel): enviar y bandeja de recepción | FE | 6 | S3.6 | CU-07 |
| S3.11 | Pruebas: transacción de ingesta, transiciones inválidas, recepción doble simultánea, sede incorrecta | QA | 6 | S3.7 | PI-02, PI-03, PI-09 |
| S3.12 | Review con Secretarías de ambas sedes + retro + refinamiento | Neg | 3 | — | — |

Total: 56 h. Demo: SEC_DIR registra un trámite, imprime la carátula con QR y lo deriva; SEC_COORD lo ve en su bandeja y lo recibe.


# 7. Sprint 4 — Tracking y dictamen (30 nov – 11 dic 2026)

Objetivo: el egresado sigue su trámite desde el celular; Kardex observa o pasa a revisión y el Coordinador dictamina.

Historias: HU-06 Línea de tiempo de trazabilidad (3 pts) · HU-13 Dictamen del Coordinador (5 pts, nueva) · HU-14 Observar y subsanar trámite (3 pts, nueva). Total: 11 pts + deuda técnica de sprints previos.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S4.1 | GET /hojas-ruta/:nro/tracking: acceso público (N.º + CI) y autenticado, respuesta sin datos sensibles | BE | 4 | S3.3 | RF-09, D-08 |
| S4.2 | Rate limit y anti-enumeración en tracking público (mismo error para N.º o CI incorrecto) | BE | 2 | S4.1 | RNF-10 |
| S4.3 | Página pública de tracking (sin login) a la que apunta el QR | FE | 4 | S4.1 | CU-06 |
| S4.4 | Componente TimelineView: estados, fechas, sede, responsable; responsivo | FE | 6 | S4.1 | HU-06, RNF-05 |
| S4.5 | "Mis trámites" en el panel del egresado | FE | 3 | S4.4 | CU-06 |
| S4.6 | Transiciones de Kardex: tomar trámite, observar (motivo), subsanar | BE | 4 | S3.3 | HU-14 |
| S4.7 | Tabla dictamen y POST /hojas-ruta/:id/dictamen; rechaza si el file está bloqueado o con requisitos incompletos | DB/BE | 5 | S4.6 | RF-13, D-11 |
| S4.8 | Bandeja de revisión de Kardex con acciones y motivo de observación | FE | 5 | S4.6 | — |
| S4.9 | Vista de dictámenes del Coordinador: pendientes, detalle del file, emitir dictamen | FE | 6 | S4.7 | CU-11 |
| S4.10 | Pruebas E2E con Playwright del flujo completo ingesta → pase → recepción → revisión → dictamen | QA | 8 | S4.9 | PI-03 |
| S4.11 | Deuda técnica y correcciones de reviews anteriores (colchón) | BE/FE | 8 | — | — |
| S4.12 | Review + retro + refinamiento | Neg | 3 | — | — |

Total: 58 h. Demo: se escanea el QR desde un celular y se ve el trámite avanzar en vivo mientras Kardex y el Coordinador actúan.


# 8. Sprint 5 — Emisión e impresión en Kardex (14–23 dic 2026)

Objetivo: Kardex previsualiza e imprime documentos oficiales y el trámite vuelve a La Paz hasta la entrega.

Historias: HU-08 Vista previa e impresión de certificaciones (8 pts) · HU-15 Retorno, firma y entrega (5 pts, nueva). Total: 13 pts.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S5.1 | Maquetar plantillas oficiales en HTML/CSS para PDF: historial académico, certificación TCLO, constancia TACFI, copia legalizada | BE | 10 | S0.2 | RF-12, D-10 |
| S5.2 | Servicio PDF (Puppeteer/pdfmake) con caché de navegador headless; meta < 2 s | BE | 5 | S5.1 | RF-11, PI-04 |
| S5.3 | Endpoint de vista previa con marca de agua "VISTA PREVIA" | BE | 2 | S5.2 | RF-11 |
| S5.4 | Tabla documento_emitido; emisión con n.º de valorado, reimpresión con motivo; bloqueado sin dictamen aprobado | DB/BE | 5 | S5.2, S4.7 | RF-12 |
| S5.5 | Transiciones de retorno: En impresión → En tránsito a La Paz → En firma → Listo → Entregado | BE | 4 | S3.3 | PRD §3 |
| S5.6 | PrintPreviewModal: visor PDF integrado, botón imprimir, registro de valorado | FE | 6 | S5.3 | CU-10 |
| S5.7 | Pantalla de SEC_DIR para recepción de retorno, firma y entrega al egresado | FE | 5 | S5.5 | — |
| S5.8 | Pruebas: PDF con datos largos (nombres, especialidades), tiempo de generación, emisión sin dictamen rechazada | QA | 5 | S5.4 | PI-04 |
| S5.9 | Revisión de plantillas impresas en papel real con Kardex (ajuste de márgenes) | Neg | 3 | S5.6 | D-10 |
| S5.10 | Review + retro + refinamiento | Neg | 3 | — | — |

Total: 48 h (sprint corto por fiestas). Demo: ciclo completo de un historial académico, de la ingesta en La Paz a la entrega.


# 9. Sprint 6 — Reportes, auditoría, pruebas y Go-Live (4–15 ene 2027)

Objetivo: dashboard y bitácora listos, sistema validado bajo carga y en producción con usuarios capacitados.

Historias: HU-09 Tablero KPI (5 pts) · HU-10 Bitácora de auditoría (3 pts) · HU-16 Despliegue y capacitación (5 pts, nueva). Total: 13 pts.


| ID | Tarea | Tipo | Horas | Depende de | Ref. |
|---|---|---|---|---|---|
| S6.1 | Consultas KPI: trámites por estado, tiempo promedio por etapa, detenidos > N días, volumen por mes; índices | DB/BE | 5 | S3.1 | RF-13, PI-08 |
| S6.2 | AnalyticsDashboard con tarjetas KPI y gráficos (Chart.js) + filtros de fecha y sede | FE | 6 | S6.1 | CU-12 |
| S6.3 | Exportación a PDF y Excel | BE | 4 | S6.1 | RF-13 |
| S6.4 | Revisar cobertura de bitácora en todas las acciones críticas; bloquear UPDATE/DELETE sobre log_auditoria (permisos de BD) | DB/BE | 4 | S1.7 | RF-14, PI-05 |
| S6.5 | AuditLogGrid con filtros por fecha, usuario y módulo | FE | 4 | S6.4 | CU-13 |
| S6.6 | Prueba de carga con k6 (50 usuarios concurrentes, p95 < 2 s) y ajustes | QA | 5 | S6.1 | RNF-04 |
| S6.7 | Revisión de seguridad: OWASP Top 10 básico, inyección, acceso por URL, cabeceras, dependencias (npm audit) | QA | 5 | — | Pruebas de seguridad |
| S6.8 | Pruebas de compatibilidad (Chrome, Firefox, Edge, Safari; 360 px y escritorio) | QA | 3 | — | RNF-05, RNF-08 |
| S6.9 | UAT: pruebas de aceptación con los 6 roles y acta firmada | Neg | 4 | S6.8 | CPA-01 |
| S6.10 | Producción: servidor, dominio, TLS, respaldo diario y prueba de restauración | DevOps | 5 | — | RNF-11, D-12 |
| S6.11 | Migración de datos reales (carga masiva) y verificación con Kardex | Neg/DB | 4 | S2.8 | D-13 |
| S6.12 | Manual de usuario por rol y guía rápida; capacitación presencial | Doc | 6 | S6.9 | Fase de lanzamiento |
| S6.13 | Go-Live el lunes 18 ene 2027 y soporte presencial la primera semana | DevOps | 3 | S6.10 | — |

Total: 58 h. Hito: acta de recepción y conformidad firmada por las autoridades.

Backlog posterior (v1.1): notificaciones por correo al cambiar estado (D-19), MFA si se confirma (D-03), modo offline parcial en Ancocagua (D-12), digitalización de escaneos en el file (D-22).

