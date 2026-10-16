# SISET — PRD v1.0 (11-oct-2026)

> Transcripción de `originales/SISET_PRD.docx`. La Figura 1 (diagrama de estados) no se transcribe: la tabla de transiciones de §3 es la fuente. Las dudas D-xx están en `dudas.md`; sus respuestas se registran en `../decisions/LOG.md`.

## 1. Resumen y objetivos

SISET es una aplicación web que digitaliza las hojas de ruta, el file académico y los pases entre la Sede Central (La Paz) y la Unidad Académica Ancocagua, para que cada trámite sea trazable en línea y ningún estudiante con requisitos pendientes o unidades reprobadas avance a titulación.

Control del documento

| Campo                | Valor                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Producto             | SISET — Sistema de Gestión y Seguimiento de Trámites                                                             |
| Cliente              | ESFM "Mcal. Andrés de Santa Cruz y Calahumana" — UA Ancocagua                                                    |
| Versión              | 1.0 (borrador para implementación)                                                                               |
| Fecha                | 11 de octubre de 2026                                                                                            |
| Autor                | Franz Jhonny Yapu Mamani                                                                                         |
| Fuente               | Borrador de tesis "requerimientos SISET" (Cap. II y III)                                                         |
| Documentos asociados | Plan de Sprints y Tareas · Registro de Dudas (D-01 a D-23)                                                       |
| Regla de lectura     | Donde el borrador se contradice, este PRD fija una decisión provisional y la marca con su código de duda (D-xx). |

Problema. Hoy el seguimiento es físico. El egresado viaja entre La Paz y Pucarani sin saber en qué instancia está su trámite. Kardex revisa requisitos (TACFI, TCLO, notas) a mano, con riesgo de error humano.

Objetivos del producto

| #   | Objetivo                            | Métrica de éxito                                             | Meta                               |
| --- | ----------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| O1  | Trazabilidad total de hojas de ruta | % de trámites con todos sus pases registrados                | 100 %                              |
| O2  | Reducir tiempo de tramitación       | Tiempo promedio ingreso → entrega (vs. línea base)           | −40 % al año                       |
| O3  | Eliminar titulaciones indebidas     | Trámites emitidos con requisitos incompletos o UF reprobadas | 0                                  |
| O4  | Consulta remota                     | Consultas de estado hechas en línea vs. presenciales         | > 70 %                             |
| O5  | Desempeño                           | Tiempo de respuesta p95 de consultas                         | < 2 s con 50 usuarios concurrentes |

La línea base de O2 y O4 no existe en el borrador; hay que medirla antes del Go-Live (D-20).

## 2. Alcance, actores y permisos

La versión 1.0 cubre 7 módulos y 6 roles; pagos en línea, cambios de jerarquía institucional y notificaciones automáticas quedan fuera.

Dentro del alcance (MVP)

| Módulo                      | Contenido                                                                           | RF                         |
| --------------------------- | ----------------------------------------------------------------------------------- | -------------------------- |
| M1 Seguridad y RBAC         | Login, sesiones, roles, usuarios, bloqueo por intentos                              | RF-01, RF-02, RF-03        |
| M2 File académico           | Datos del estudiante, requisitos, semáforo, bloqueo por permiso obligatorio (D-07b) | RF-04, RF-07               |
| M3 Ingesta de hojas de ruta | Registro de trámite, código correlativo, QR                                         | RF-08                      |
| M4 Tracking                 | Línea de tiempo del trámite                                                         | RF-09                      |
| M5 Pases y derivaciones     | Envío y recepción entre sedes, cadena de custodia                                   | RF-10                      |
| M6 Emisión en Kardex        | TCLO, TACFI, vista previa PDF, impresión oficial                                    | RF-05, RF-06, RF-11, RF-12 |
| M7 Reportes y auditoría     | Dictamen, dashboard KPI, exportación, bitácora                                      | RF-13, RF-14               |

Fuera del alcance

- Cobros o pagos en línea (límite normativo).
- Modificar jerarquías o estructura institucional.
- Notificaciones por correo/WhatsApp (mejora futura, D-19).
- Integración automática con sistemas del Ministerio (D-07).
- App móvil nativa: la web responsiva cubre móviles.
  Actores

| Código      | Rol                                   | Sede      | Uso principal                       |
| ----------- | ------------------------------------- | --------- | ----------------------------------- |
| ESTUDIANTE  | Estudiante en formación (1.º–5.º año) | —         | Consulta su file y alertas          |
| EGRESADO    | Maestro egresado                      | —         | Sigue su trámite (tracking)         |
| SEC_DIR     | Secretaría de Dirección General       | La Paz    | Ingresa hojas de ruta, deriva       |
| SEC_COORD   | Secretaría de Coordinación            | Ancocagua | Recibe y deriva expedientes         |
| COORDINADOR | Coordinador Académico                 | Ancocagua | Dictamina, ve reportes              |
| KARDEX      | Responsable de Archivo Kardex (admin) | Ancocagua | Administra, valida, emite e imprime |

Matriz RBAC (C = crear, L = leer, E = editar, — = sin acceso; "propio" = solo sus registros)

| Recurso                         | ESTUDIANTE | EGRESADO                | SEC_DIR | SEC_COORD | COORDINADOR | KARDEX |
| ------------------------------- | ---------- | ----------------------- | ------- | --------- | ----------- | ------ |
| Usuarios y roles                | —          | —                       | —       | —         | —           | C/L/E  |
| File académico                  | L propio   | L propio                | L       | L         | L           | C/L/E  |
| Requisitos (TACFI, TCLO, notas) | L propio   | L propio                | —       | L         | L           | C/L/E  |
| Hoja de ruta                    | —          | L propio                | C/L     | L         | L           | L/E    |
| Pases                           | —          | L propio (vía tracking) | C/L     | C/L       | L           | C/L    |
| Dictamen                        | —          | L propio                | —       | —         | C/L         | L      |
| Emisión e impresión             | —          | —                       | —       | —         | —           | C/L    |
| Dashboard y reportes            | —          | —                       | L       | —         | L           | L      |
| Bitácora                        | —          | —                       | —       | —         | —           | L      |

La matriz es una propuesta derivada del borrador; debe validarla el Product Owner (D-16).

## 3. Flujos de negocio y estados

El sistema maneja dos flujos: el del estudiante activo (interno en Ancocagua) y el del egresado (entre sedes, con hoja de ruta y tracking).

Flujo A — Estudiante en formación (1.º a 5.º año)

- El estudiante entrega documentos en Secretaría de Coordinación o directamente en Kardex.
- Si entra por Coordinación, esta lo deriva a Kardex (pase interno).
- Kardex registra el descargo, actualiza el file y los requisitos.
- El sistema recalcula el semáforo y, si hay UF reprobadas sobre el límite, bloquea el file.
  Flujo B — Maestro egresado (historial académico, legalizaciones)

Figura 1. Máquina de estados de la hoja de ruta: 10 estados + Observado

Cada transición crea un registro en movimiento_hoja_ruta (fecha, sede, usuario, observación); ese historial es la línea de tiempo que ve el egresado. Solo las transiciones del diagrama son válidas: el backend rechaza cualquier otra con error 409.

| Transición                          | Quién la ejecuta   | Condición                               |
| ----------------------------------- | ------------------ | --------------------------------------- |
| → Registrado                        | SEC_DIR            | Valorado canjeado, file existente       |
| Registrado → En tránsito            | SEC_DIR            | Crea pase La Paz → Ancocagua            |
| En tránsito → Recibido              | SEC_COORD o KARDEX | Confirma recepción del pase             |
| Recibido → En revisión              | KARDEX             | Toma el trámite                         |
| En revisión → Observado             | KARDEX             | Requisito faltante o file bloqueado     |
| Observado → En revisión             | KARDEX             | Requisito subsanado                     |
| En revisión → Dictaminado           | COORDINADOR        | File sin bloqueo y requisitos completos |
| Dictaminado → En impresión          | KARDEX             | Dictamen = Aprobado                     |
| En impresión → En tránsito a La Paz | KARDEX             | Documento emitido; crea pase de retorno |
| → En firma → Listo → Entregado      | SEC_DIR            | Recepción, firmas y entrega al egresado |

## 4. Requisitos funcionales

Cada RF es "terminado" solo si cumple todos sus criterios de aceptación (CA) y la Definición de Terminado de la sección 6.

| Código | Requisito                          | Prioridad | Criterios de aceptación                                                                                                                                                                                                                                                                                                    |
| ------ | ---------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01  | Autenticación y cierre de sesión   | Must      | CA1: login con CI + contraseña (D-14). CA2: 5 intentos fallidos bloquean la cuenta 15 min. CA3: sesión expira tras 15 min sin actividad (RNF-02). CA4: logout invalida el refresh token. CA5: MFA solo si D-03 lo confirma.                                                                                                |
| RF-02  | Control de acceso por roles (RBAC) | Must      | CA1: el menú muestra solo módulos del rol. CA2: una ruta de API sin permiso responde 403 aunque se llame por URL directa. CA3: "propio" se valida en backend (un estudiante no lee el file de otro cambiando el id).                                                                                                       |
| RF-03  | Gestión de usuarios                | Must      | CA1: Kardex crea, edita, da de baja y reactiva usuarios. CA2: la baja es lógica (nunca DELETE). CA3: CI único. CA4: reseteo de contraseña por Kardex obliga a cambiarla en el siguiente login.                                                                                                                             |
| RF-04  | Consulta del file académico        | Must      | CA1: el estudiante ve sus requisitos del folder personal, con la matrícula y el certificado de notas de cada gestión (DEC-051). CA2: vista de solo lectura. CA3: Kardex busca files por CI, nombre, código, especialidad y año, con paginación de servidor.                                                                |
| RF-05  | Asentamiento TCLO                  | Must      | CA1: Kardex registra nivel(es) acreditado(s), fecha y número de certificado. CA2: el requisito pasa a "Completo" solo con el nivel exigido (D-04).                                                                                                                                                                         |
| RF-06  | Recepción física TACFI             | Must      | CA1: Kardex marca recibido con fecha y responsable. CA2: el semáforo del estudiante se actualiza al instante.                                                                                                                                                                                                              |
| RF-07  | Alertas y bloqueo por requisitos   | Must      | CA1: semáforo verde/amarillo/rojo por requisito y global. CA2: por licencia temporal obligatoria o voluntaria, Kardex bloquea el file con el número, la fecha, la glosa y el PDF de la resolución (D-29, DEC-049), y no se puede dictaminar ni emitir. CA3: el desbloqueo registra quién y cuándo; todo queda en bitácora. |
| RF-08  | Ingesta de hoja de ruta            | Must      | CA1: SEC_DIR registra trámite vinculado a un file. CA2: código correlativo único por gestión (ej. HR-2026-000123), generado en transacción. CA3: se genera QR que apunta a la URL de tracking. CA4: se imprime una carátula de hoja de ruta.                                                                               |
| RF-09  | Tracking (línea de tiempo)         | Must      | CA1: muestra cada estado con fecha, sede y responsable. CA2: acceso público con N.º de hoja de ruta + CI, o autenticado (D-08). CA3: el acceso público no muestra datos personales más allá de nombre y estados.                                                                                                           |
| RF-10  | Pases entre sedes                  | Must      | CA1: registrar envío (origen, destino, observación). CA2: el destino ve una bandeja "Por recibir" y confirma recepción. CA3: no se puede enviar un trámite que no está en la sede del usuario. CA4: dos usuarios no pueden mover el mismo trámite a la vez (bloqueo de fila).                                              |
| RF-11  | Vista previa de documentos         | Must      | CA1: PDF renderizado en pantalla antes de imprimir. CA2: incluye marca de agua "VISTA PREVIA". CA3: genera en < 2 s.                                                                                                                                                                                                       |
| RF-12  | Impresión oficial                  | Must      | CA1: plantillas oficiales por tipo de documento (D-10). CA2: cada impresión registra número de valorado y usuario. CA3: reimprimir exige motivo.                                                                                                                                                                           |
| RF-13  | Dictamen, reportes y dashboard     | Should    | CA1: el Coordinador emite dictamen (Aprobado / Observado) con observación (D-11). CA2: dashboard con volumen por estado, tiempo promedio por etapa y trámites detenidos > N días. CA3: exporta a PDF y Excel.                                                                                                              |
| RF-14  | Bitácora de auditoría              | Should    | CA1: registra fecha, usuario, IP, acción, módulo, valores antes/después. CA2: la tabla no admite UPDATE ni DELETE desde la app. CA3: Kardex filtra por fecha, usuario y módulo.                                                                                                                                            |

Prioridad MoSCoW: Must = bloquea el Go-Live; Should = entra si el calendario lo permite (D-06).

## 5. Requisitos no funcionales y diseño técnico

Se implementa con React + Node/Express + PostgreSQL, la pila que usan los sprints y pruebas del borrador; las menciones a PHP/MySQL se tratan como error de redacción hasta cerrar D-01.

Requisitos no funcionales (ISO/IEC 25010)

| Código | Atributo       | Requisito medible                                                                                                                                          |
| ------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Seguridad      | Contraseñas con bcrypt, costo ≥ 12. Nunca en logs ni respuestas.                                                                                           |
| RNF-02 | Seguridad      | Access token JWT de 15 min + refresh token en cookie httpOnly, Secure, SameSite=Strict. Inactividad 15 min = cierre.                                       |
| RNF-03 | Confiabilidad  | FK con ON DELETE RESTRICT, transacciones en ingesta y pases, borrado lógico.                                                                               |
| RNF-04 | Desempeño      | p95 < 2 s con 50 usuarios concurrentes (prueba de carga con k6).                                                                                           |
| RNF-05 | Usabilidad     | Responsivo desde 360 px de ancho.                                                                                                                          |
| RNF-06 | Usabilidad     | Toda función principal a ≤ 3 clics desde el panel del rol.                                                                                                 |
| RNF-07 | Mantenibilidad | Backend por capas (rutas → controlador → servicio → repositorio). Cobertura de pruebas ≥ 70 % en servicios.                                                |
| RNF-08 | Compatibilidad | Últimas 2 versiones de Chrome, Firefox, Edge y Safari.                                                                                                     |
| RNF-09 | Cumplimiento   | Solo software libre (Ley N.º 164, lineamientos AGETIC).                                                                                                    |
| RNF-10 | Seguridad      | HTTPS obligatorio, Helmet, CORS restringido, rate limit en login (10/min por IP), validación de entrada con esquemas (Zod).                                |
| RNF-11 | Disponibilidad | Respaldo diario de la BD con retención de 30 días y restauración probada una vez antes del Go-Live.                                                        |
| RNF-12 | Resiliencia    | Ante corte de red en Ancocagua, la interfaz muestra estado "sin conexión" y no pierde formularios en curso. Operación offline completa queda fuera (D-12). |

Stack

| Capa            | Tecnología                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Frontend        | React 18 + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, Axios, React Hook Form + Zod, Chart.js              |
| Backend         | Node.js 20 LTS + Express + TypeScript, Prisma ORM (D-02), jsonwebtoken, bcrypt, qrcode, Puppeteer o pdfmake para PDF, exceljs |
| Base de datos   | PostgreSQL 16                                                                                                                 |
| Pruebas         | Vitest/Jest + Supertest (API), Playwright (E2E), k6 (carga)                                                                   |
| Infraestructura | Docker Compose, Nginx como proxy con TLS (Let's Encrypt), GitHub para código y CI (GitHub Actions)                            |

Modelo de datos

El borrador define 7 tablas. Faltan tablas para soportar los RF; se agregan las marcadas como nuevas.

| Tabla                | Propósito                                   | Campos clave                                                                                                                        | Origen            |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| rol                  | 6 roles                                     | id, codigo, nombre                                                                                                                  | Borrador          |
| usuario              | Identidad y credenciales                    | id, rol_id, ci (único), nombres, apellidos, password_hash, email, activo, intentos_fallidos, bloqueado_hasta, debe_cambiar_password | Borrador + campos |
| sede                 | Catálogo de sedes                           | id, codigo (LA_PAZ, ANCOCAGUA), nombre                                                                                              | Nueva             |
| especialidad         | Catálogo                                    | id, nombre, activo                                                                                                                  | Nueva             |
| file_academico       | Expediente                                  | id, usuario_id, codigo_estudiante, especialidad_id, anio_ingreso, estado_global, bloqueado, motivo_bloqueo                          | Borrador + campos |
| matricula            | Matrícula anual                             | id, file_id, anio_formacion (1–5), gestion, estado                                                                                  | Nueva             |
| resultado_anual      | Estado de notas por año                     | id, file_id, anio_formacion, resultado (APROBADO/REPROBADO), uf_reprobadas, fuente                                                  | Nueva (D-07)      |
| requisito_tipo       | Catálogo parametrizable                     | id, codigo (TACFI, TCLO, CERT_NOTAS…), nombre, obligatorio_para                                                                     | Nueva (riesgo R4) |
| requisito_file       | Estado de cada requisito                    | id, file_id, requisito_tipo_id, estado, fecha, nro_documento, registrado_por                                                        | Nueva             |
| hoja_ruta            | Trámite                                     | id, file_id, nro_tramite (único), tipo_tramite, sede_actual_id, estado_actual, fecha_ingreso, creado_por                            | Borrador + campos |
| movimiento_hoja_ruta | Historial de estados (alimenta el timeline) | id, hoja_ruta_id, estado_anterior, estado_nuevo, sede_id, usuario_id, observacion, fecha                                            | Nueva             |
| pase_derivacion      | Envío/recepción                             | id, hoja_ruta_id, sede_origen_id, sede_destino_id, usuario_envia_id, usuario_recibe_id, fecha_envio, fecha_recepcion, observacion   | Borrador + campos |
| dictamen             | Resolución                                  | id, hoja_ruta_id, coordinador_id, resultado, observaciones, fecha                                                                   | Borrador          |
| documento_emitido    | Impresiones oficiales                       | id, hoja_ruta_id, tipo_documento, nro_valorado, usuario_id, es_reimpresion, motivo, fecha                                           | Nueva             |
| refresh_token        | Sesiones                                    | id, usuario_id, token_hash, expira, revocado                                                                                        | Nueva             |
| log_auditoria        | Bitácora                                    | id, usuario_id, accion, modulo, entidad, entidad_id, datos_antes (JSONB), datos_despues (JSONB), ip, fecha                          | Borrador + campos |

Convenciones: claves id BIGSERIAL, fechas TIMESTAMPTZ en zona America/La_Paz, created_at y updated_at en todas las tablas operativas.

Bitácora (RF-14). Un trigger no conoce la IP del cliente. Propuesta: la API registra el evento en la misma transacción; opcionalmente el trigger lee la IP desde SET LOCAL app.ip. Decisión en D-17.

API REST (resumen, prefijo /api/v1)

| Método y ruta                                                | Uso                               | Roles                                                       |
| ------------------------------------------------------------ | --------------------------------- | ----------------------------------------------------------- |
| POST /auth/login · /auth/refresh · /auth/logout              | Sesión                            | Todos                                                       |
| GET/POST/PATCH /usuarios                                     | Gestión de usuarios               | KARDEX                                                      |
| GET /files · GET /files/:id                                  | Búsqueda y detalle de file        | KARDEX, COORDINADOR, SEC_*; propio para ESTUDIANTE/EGRESADO |
| PATCH /files/:id/requisitos/:tipo                            | TACFI, TCLO, certificado de notas | KARDEX                                                      |
| POST /files/:id/resultados                                   | Resultado anual de notas          | KARDEX                                                      |
| POST /hojas-ruta                                             | Ingesta                           | SEC_DIR                                                     |
| GET /hojas-ruta/:nro/tracking                                | Timeline                          | Público con CI o autenticado (D-08)                         |
| POST /hojas-ruta/:id/pases · PATCH /pases/:id/recepcion      | Derivar y recibir                 | SEC_DIR, SEC_COORD, KARDEX                                  |
| POST /hojas-ruta/:id/dictamen                                | Dictamen                          | COORDINADOR                                                 |
| GET /hojas-ruta/:id/documentos/:tipo/preview · POST …/emitir | PDF y emisión                     | KARDEX                                                      |
| GET /reportes/kpi · GET /reportes/export?formato=pdf o xlsx  | Dashboard                         | COORDINADOR, SEC_DIR, KARDEX                                |
| GET /auditoria                                               | Bitácora                          | KARDEX                                                      |

Errores en formato único: { "error": { "code", "message", "details" } }. Documentación con OpenAPI (Swagger) generada desde el código.

## 6. Supuestos, riesgos y Definición de Terminado

El mayor riesgo no es técnico: el borrador fija el Go-Live en la primera semana de noviembre de 2026 y el plan realista necesita más tiempo. Se resolvió con un piloto en noviembre (ingreso, bitácora y file académico básico) y el sistema completo después (DEC-009).

Supuestos provisionales (válidos hasta cerrar la duda indicada)

- Stack Node + React + PostgreSQL (D-01).
- Un solo servidor central accesible por internet desde ambas sedes (D-12).
- Kardex funciona en Ancocagua; "Calahumana" es el nombre de la ESFM, no una sede distinta (D-15).
- El sistema no registra notas: las cargan los docentes en un sistema del Ministerio (D-07). El bloqueo lo registra Kardex por el permiso obligatorio (D-07b).
- No hay MFA en la v1.0 (D-03).
  Riesgos

| ID  | Riesgo                                                             | Prob. | Impacto | Mitigación                                                            |
| --- | ------------------------------------------------------------------ | ----- | ------- | --------------------------------------------------------------------- |
| R1  | Calendario: Go-Live de noviembre inalcanzable con alcance completo | Alta  | Alto    | Piloto acotado en nov (DEC-009); MVP con solo "Must"; Should a v1.1   |
| R2  | Reglas TACFI/TCLO/notas mal definidas                              | Alta  | Alto    | Catálogo de requisitos parametrizable; validar con Kardex en Sprint 0 |
| R3  | Resistencia al cambio del personal                                 | Alta  | Medio   | Demos por sprint con usuarios reales, manual y capacitación           |
| R4  | Conectividad intermitente en Ancocagua                             | Alta  | Medio   | Interfaz ligera, reintentos, guardado de borradores en el navegador   |
| R5  | Migración de files históricos                                      | Media | Alto    | Plantilla Excel de carga masiva + validación (D-13)                   |
| R6  | Acceso indebido vía URL o IDs                                      | Baja  | Alto    | Autorización en backend por propiedad, pruebas E2E por rol            |

Definición de Terminado (DoD)

- Código en main vía pull request revisado.
- Todos los criterios de aceptación del RF cumplidos.
- Pruebas unitarias y de API pasan en CI; cobertura del servicio ≥ 70 %.
- Permisos verificados por rol (prueba negativa incluida).
- Acción crítica registrada en bitácora.
- Pantalla probada en móvil (360 px) y escritorio.
- Endpoint documentado en OpenAPI.
- Desplegado en el entorno de staging y mostrado en la Sprint Review.
  Glosario

| Término           | Significado                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Hoja de ruta      | Instrumento de control con código correlativo que acompaña un trámite por cada instancia |
| File académico    | Expediente personal del estudiante o egresado en Kardex                                  |
| Pase / derivación | Traslado registrado de un expediente de una sede a otra                                  |
| Descargo          | Registro de lo actuado por una instancia antes de derivar                                |
| Valorado          | Formulario oficial numerado que se canjea o imprime                                      |
| UF                | Unidad de Formación (materia)                                                            |
| TACFI / TCLO      | Requisitos de titulación; definición exacta pendiente (D-04)                             |
