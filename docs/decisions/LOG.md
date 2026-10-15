# Log de decisiones

Append-only. Una entrada por respuesta de stakeholder, resolución de
discrepancia, o decisión de alcance que no queda cubierta por un ADR. Nunca se
edita una entrada pasada — se reemplaza con una nueva que referencia el ID
viejo.

Formato:

```
## DEC-001 — <título corto>
**Fecha:** YYYY-MM-DD · **Fuente:** <quién/dónde> · **Estado:** activa | reemplazada por DEC-XXX

<qué se decidió, en lenguaje llano>

## DEC-001 — Interpretaciones del prototipo de pantallas (a validar en Sprint 0)
**Fecha:** 2026-10-12 · **Fuente:** construcción del prototipo (`apps/web`) · **Estado:** activa (provisional)

Donde la spec y el PRD no coincidían o no decían nada, el prototipo hace esto:
1. "Enviado a dictamen" no es un estado nuevo: es una marca dentro de *En revisión* (spec P-31). Mientras la tiene, Kardex ya no puede observar el trámite.
2. Un dictamen **Observado** devuelve el trámite al estado *Observado* (lo subsana Kardex). PRD §3 solo describe el camino Aprobado (D-11).
3. *Emitir documento* (P-44) pasa de *Dictaminado* a *En impresión* y registra el valorado; luego *Enviar a La Paz* pasa a *En tránsito a La Paz*.
4. Cuando SEC_DIR confirma la recepción del retorno, el trámite pasa directo a *En firma*.
5. Bloqueo: más de 2 UF reprobadas en un mismo año (límite configurable, D-07). La spec mostraba un ejemplo con 2; se tomó "supera el límite".
6. El selector de tipo de documento en la vista previa permite emitir Historial, Certificación TCLO o Constancia TACFI para cualquier trámite (D-21 pendiente).

## DEC-002 — Backend como monolito modular y SDD por ticket
**Fecha:** 2026-10-13 · **Fuente:** pedido del responsable del proyecto · **Estado:** activa

1. `apps/api` se construye como **monolito modular** (ADR-0001): módulos en
   `src/modulos/<modulo>/` con sus capas internas (rutas → controlador →
   servicio → repositorio), código transversal en `src/compartido/`, y
   fronteras forzadas por ESLint. RNF-07 se cumple dentro de cada módulo.
2. Esto **enmienda** el backlog y los tickets de la Ola 1:
   - S0.7: la estructura deja de ser `src/{rutas,controladores,servicios,repositorios,middlewares,lib}`;
     pasa a `src/compartido/` + `src/modulos/` según ADR-0001. S0.7 crea solo
     `compartido/` y un módulo de ejemplo (`salud`, para `GET /api/v1/health`).
   - S0.3: la configuración de ESLint incluye la regla de fronteras entre módulos.
   - S0.6: cada tabla del esquema se asigna al módulo dueño de ADR-0001.
3. **SDD obligatorio por ticket**: ningún ticket se codea sin
   `docs/sdd/<ID>/SDD.md` en Estado `Aprobado (fecha)`, generado con
   `task-brief` → `write-sdd`. Todo SDD de backend declara en §2 qué
   módulo(s) toca y qué API pública agrega o consume.

## DEC-003 — Versión de Node.js
**Fecha:** 2026-10-13 · **Fuente:** task-brief de S0.3 · **Estado:** reemplazada por DEC-004

El PRD §5 fija "Node.js 20 LTS", pero Node 20 quedó sin soporte en abril de
2026. Provisionalmente se usa **Node 22 LTS** (soporte hasta abril de 2027),
declarado en `engines` y `.nvmrc`. Queda por confirmar si se pasa a Node 24 LTS
(soporte hasta 2028) para tener margen después del Go-Live; el cambio cuesta poco
mientras no haya despliegue.

## DEC-004 — Usar las versiones más actuales del stack (reemplaza DEC-003)
**Fecha:** 2026-10-13 · **Fuente:** pedido del responsable del proyecto · **Estado:** activa

Regla: cada dependencia usa **la última versión estable mayor** al momento de
instalarla, salvo que sea incompatible con otra pieza del stack; en ese caso se
usa la más nueva compatible y se anota aquí. Esto enmienda la tabla de stack del
PRD §5 (React 18, Node 20).

Versiones vigentes (verificadas en npm y nodejs.org el 2026-10-13):

| Pieza | Versión | Nota |
|---|---|---|
| Node.js | **26** | Hoy es "Current"; pasa a LTS a fines de oct-2026 (soporte hasta abr-2029). |
| TypeScript | **6.0** | TS 7.0 existe, pero typescript-eslint 8 exige `<6.1`. Se sube cuando lo soporte. |
| React / React DOM | 19.3 | |
| React Router | 8 (`react-router`) | Reemplaza a `react-router-dom` 6. |
| Vite / @vitejs/plugin-react | 8 / 6 | |
| Tailwind CSS | 4.3 | |
| Express | 5.3 | |
| Prisma | 7.10 | Prisma 8 todavía está en rc. |
| Vitest | 5 | |
| ESLint / typescript-eslint / react-hooks | 10 / 8.71 / 7 | |
| Zod · TanStack Query · Axios · React Hook Form | 4 · 5 · 1.20 · 7 | Se instalan en sus tickets (S0.7, S0.8). |
| Build de la API | tsdown | tsup no recibe cambios desde nov-2025. |

Consecuencia: se agrega la tarea **S0.10 — Actualizar `apps/web` al stack
vigente** (React 19, React Router 8, Vite 8, lucide-react 1.x, etc.), con su
propio SDD. Va después de S0.3 y antes de S0.8. S0.3 no cambia las versiones
de web, solo las de las herramientas nuevas.
```

## DEC-005 — PostgreSQL 18 y servicio `db` adelantado a S0.6

**Fecha:** 2026-10-13 · **Fuente:** task-brief de S0.6 · **Estado:** activa (provisional)

1. Por la regla de DEC-004 se usa **PostgreSQL 18** (18.6 es la última estable al
   2026-10-13) en lugar de la 16 del PRD §5. Queda provisional hasta cerrar D-12:
   si el servidor institucional impone otra versión, se baja (el esquema no usa
   nada exclusivo de la 18).
2. S0.6 dependía de S0.4 (Docker Compose), que no está hecho. S0.6 crea un
   `docker-compose.yml` mínimo con **solo el servicio `db`**; S0.4 lo extiende con
   api, web y Nginx.
3. La contraseña se hashea con **`bcryptjs`** (mismo algoritmo y formato que
   bcrypt, costo 12, RNF-01): `bcrypt` es nativo y npm 11 bloquea su script de
   instalación.

## DEC-006 — Modelo de datos v1, módulo `personas` y autorización con Casbin

**Fecha:** 2026-10-13 · **Fuente:** responsable del proyecto, sobre `docs/bd-tentaiva/ANALISIS.md` · **Estado:** activa

1. Se adopta como **modelo objetivo** el modelo tentativo de `docs/bd-tentaiva/`, con las correcciones del
   análisis. El documento vigente es `docs/product/modelo-datos.md`; gana sobre `docs/bd-tentaiva/`.
2. **Enmienda business-rules §Convenciones de datos:** ids `INTEGER` autoincrementales (`SERIAL`
   vía Prisma) en lugar de `BIGSERIAL`. Excepciones a `ON DELETE RESTRICT`: `refresh_token` y
   `tipo_tramite_requisito` en `CASCADE`. `CHECK`, índices parciales, triggers y funciones van como SQL
   dentro de las migraciones de Prisma (no "SQL primero").
3. **Enmienda ADR-0001:** nuevo módulo **`personas`**, dueño de la tabla `persona` (la usan `seguridad` y
   `files` por su API pública).
4. **Enmienda S0.6 (ya en `main`):** como no hay ninguna base desplegada, la migración inicial se rehace
   (tarea nueva **S0.11**, antes de S0.7) con `persona`, ids `INTEGER`, `ip INET`, los campos completos de
   `usuario` y los triggers de solo inserción de `log_auditoria` (incluido `TRUNCATE`).
5. `log_auditoria.usuario_id` pasa a **nullable**. No cierra D-26: solo permite ambas respuestas.
6. **Autorización con Casbin** y política en archivo versionado: ADR-0002.

## DEC-007 — Trazabilidad de acciones por usuario desde el inicio

**Fecha:** 2026-10-13 · **Fuente:** responsable del proyecto · **Estado:** activa

1. **RF-14 (bitácora) pasa de "Should" a "Must".** Debe existir un historial de acciones por usuario que el
   administrador (Kardex, que en el PRD §2 gestiona usuarios y bitácora) consulta: quién entró al sistema,
   quién creó, editó o dio de baja algo, cuándo, desde qué IP y con qué valores antes y después.
2. **La base de auditoría se adelanta a S0.7**: contexto de la petición (usuario, IP, user agent, id de
   petición) y el servicio público `auditoria.registrarEvento()`, que escribe en la misma transacción que
   la operación (D-17).
3. **Regla para todos los tickets siguientes:** toda escritura de negocio (crear, editar, dar de baja,
   cambiar de estado) y todo evento de acceso (login, login fallido, logout, cambio de contraseña) registra
   un evento de auditoría en la misma transacción. Entra en la Definición de Terminado de cada ticket.
4. **S6.4 / S6.5 se adelantan a la Ola 2**, justo después de la autenticación (S1.x): `GET /auditoria`
   (solo KARDEX) con filtros por usuario, módulo, acción, fecha y **entidad** (historial de un registro:
   "quién editó este file"), conectados a la pantalla P-48. El `REVOKE` de permisos sigue en S6.4 (ADR-0003).

## DEC-008 — Docker: un solo Nginx y rol de BD separado en S6.4

**Fecha:** 2026-10-13 · **Fuente:** SDD de S0.4 (aprobado) · **Estado:** activa

1. El contenedor `web` es **un solo Nginx** que sirve la SPA y hace de proxy de `/api` hacia la API (el
   ticket pedía `web` + `nginx` separados). Mismo origen para web y API (cookie del refresh, S0.8).
2. El **rol de BD separado para la app** (sin `UPDATE/DELETE/TRUNCATE` en la bitácora) se crea en
   **S6.4**, junto con el `REVOKE` que lo usa. Aclara ADR-0003, que decía "S0.4/S0.9".
3. `JWT_SECRET` se agrega en S1.x, cuando exista código que lo lea.

## DEC-009 — Opción B: piloto en noviembre y sistema completo después (cierra D-06)

**Fecha:** 2026-10-13 · **Fuente:** respuesta de D-06 en la hoja "Preguntas para la escuela" + confirmación del
responsable del proyecto ("sí, confirma la opción B") · **Estado:** activa

1. **Piloto la primera semana de noviembre de 2026** (lunes 2 al viernes 6), con el personal administrativo
   cargando datos reales de estudiantes. Alcance del piloto: **ingreso al sistema y permisos** (Sprint 1
   completo), **bitácora** (DEC-007) y **file académico básico** (crear, editar y buscar files; datos personales,
   especialidad y año). Desarrollo hasta el **viernes 30 de octubre**; la semana del piloto es para puesta en
   marcha, capacitación de Kardex, carga de datos y correcciones.
2. **Usuarios del piloto: solo el personal** (Kardex, Secretarías, Coordinación). Estudiantes y egresados
   entran después del piloto ("mi file", tracking).
3. **Entra en el piloto solo si la escuela responde antes del 23-oct:** matrículas y resultado anual (D-07) e
   importación desde Excel (D-13). Sin respuesta, el file del piloto lleva solo datos personales y académicos
   básicos, y la carga es manual.
4. **Pantallas para el docente tutor:** se usan las del prototipo en modo demo (kit de S0.1), que ya muestran
   todos los módulos. No suman trabajo de desarrollo; publicarlas en línea depende del despliegue en el VPS.
5. **Sistema completo (v1.0) después del piloto:** hojas de ruta, pases, tracking, dictamen, emisión y
   reportes, en sprints desde el 9 de noviembre. La meta de referencia sigue siendo el **18-ene-2027**
   (opción A del plan); se recalcula al terminar el piloto con la velocidad real.
6. **Datos reales exigen un servidor definido:** el piloto no arranca con datos de estudiantes sin respuesta
   de D-12 (dónde funciona el sistema) y sin respaldo diario con restauración probada (RNF-11). D-12 pasa a
   urgente.

## DEC-010 — `parametro` entra en S1.1; la auditoría de sesiones vive en el caso de uso

**Fecha:** 2026-10-13 · **Fuente:** SDD de S1.1 (aprobado) · **Estado:** activa

1. **La tabla `parametro` se crea en S1.1**, aunque el ticket solo nombraba `refresh_token`: el modelo de
   datos y el SDD de S0.11 se la asignan, y S1.4 (bloqueo) la necesita. La migración siembra solo
   `MAX_INTENTOS_LOGIN = 5` y `MIN_BLOQUEO_LOGIN = 15` (business-rules §Seguridad). `MAX_UF_REPROBADAS`
   espera a D-07 y `DIAS_ALERTA_TRAMITE` a S3.x. S1.1 pasa de 2 h a 2,5 h.
2. **Las filas de `refresh_token` no se auditan en el repositorio.** El evento de acceso lo registra el
   servicio del caso de uso, en la misma transacción (DEC-007): `LOGIN` en S1.3, `LOGOUT` en S1.5. La
   rotación normal del refresh no es un evento; el reuso detectado sí, y lo define S1.5.
3. **Pendiente para el SDD de S1.3/S1.5:** la duración del refresh token (ni el PRD ni las reglas la fijan).
   Propuesta: una jornada (8 h), renovada con cada rotación mientras haya actividad.

## DEC-011 — Contraseña con símbolos, eventos de acceso cerrados y criterio para decisiones técnicas

**Fecha:** 2026-10-13 · **Fuente:** responsable del proyecto + SDD de S1.2-S1.7 (aprobado) · **Estado:** activa

1. **Política de contraseña (pedido del responsable):** mínimo 8 caracteres, con **letras, números y
   símbolos**. Símbolo = cualquier carácter que no sea letra, número ni espacio. Letras = cualquier letra
   Unicode (ñ y tildes cuentan). Cambia `business-rules.md` §Seguridad; web (`validarClave`) y API
   (`esquemaPassword`) aplican la misma regla y prueban la misma tabla de casos.
2. **Máximo 72 bytes** (decisión técnica): bcrypt ignora lo que pasa de 72 bytes.
3. **Acciones de acceso:** se usan los nombres de S0.7 (`LOGIN`, `LOGIN_FALLIDO`, `LOGOUT`,
   `CAMBIAR_PASSWORD`, `RESTABLECER_PASSWORD`, `BLOQUEO_CUENTA`), no los del ticket S1.7.
4. **Los eventos de acceso se registran solo con `seguridad/eventos-acceso.ts`**, que no acepta datos
   libres: así nunca llega una contraseña ni un token a la bitácora. Exigen un usuario (D-26 provisional).
5. **Pendiente para un ADR de la bitácora:** `redactar` no tapa claves en español (`clave`, `contrasena`).
   Convención mientras tanto: todo campo de contraseña en el código se llama `password…`.
6. **Criterio de trabajo:** las decisiones técnicas (largos, límites, tipos) las toma el desarrollo y quedan
   escritas en el SDD; a la escuela solo se le llevan decisiones de flujo o críticas.

## DEC-012 — Contrato del login, duración de la sesión y JWT

**Fecha:** 2026-10-13 · **Fuente:** SDD de S1.3 (aprobado) · **Estado:** activa

1. **Contrato:** `POST /api/v1/auth/login` con `{ usuario, password }` (antes la web mandaba `clave`).
   Responde `{ accessToken, expiraEn, usuario }` y deja el refresh en la cookie `siset_refresh`
   (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth`). CI inexistente, contraseña incorrecta,
   cuenta inactiva o bloqueada: el mismo 401 `CREDENCIALES_INVALIDAS`, con una comparación bcrypt en todos
   los casos para no revelar qué CI existen.
2. **Sesión de 8 h desde el login** (cierra DEC-010 #3): la rotación de S1.5 hereda el vencimiento, no lo
   extiende. La inactividad de 15 min la controlan el access de 15 min y la web (S1.10).
3. **Access JWT HS256 con `jose`** (6.2.12, MIT): `sub`, `rol`, `sede`, `cpw` (debe cambiar la contraseña,
   para S1.6), `iss: siset`. `JWT_SECRET` obligatorio, de 32 caracteres o más, en config, Compose, CI y
   staging (el script lo genera con `openssl`). Completa DEC-008 #3.
4. **Módulo `personas`** con `buscarNombreCompleto` como única API pública; la raíz de composición
   (`app.ts`) lo conecta con `seguridad`.

## DEC-013 — Contador de intentos, bloqueo y rate limit del login

**Fecha:** 2026-10-13 · **Fuente:** SDD de S1.4 (aprobado) · **Estado:** activa

1. **Contador:** cada contraseña incorrecta suma 1 (atómico). Al llegar a `MAX_INTENTOS_LOGIN` la cuenta se
   bloquea `MIN_BLOQUEO_LOGIN` minutos y el contador **vuelve a 0**. Un login correcto también lo deja en 0.
   "Seguidos" = sin un login correcto en medio, sin ventana de tiempo.
2. **Durante el bloqueo** los errores no suman ni extienden el bloqueo, para que nadie pueda dejar a otra
   persona sin entrar indefinidamente. La respuesta sigue siendo el 401 genérico (DEC-012).
3. Los valores se leen de `parametro` en cada intento (módulo `catalogos`, `leerParametrosEnteros`). Un valor
   inválido es un error, nunca un default silencioso.
4. **Rate limit:** `express-rate-limit` 8.7.0, en memoria (una sola instancia de la API), solo en
   `POST /auth/login`, 10 peticiones por minuto por IP contando todas; 429 `DEMASIADAS_PETICIONES`.
   Configurable con `LOGIN_LIMITE_POR_MINUTO` si la escuela sale por una sola IP.

## DEC-014 — Refresh con rotación, logout, cambio de contraseña y `autenticar`

**Fecha:** 2026-10-13 · **Fuente:** SDD de S1.5 (aprobado) · **Estado:** activa

1. `POST /auth/refresh` y `POST /auth/logout` funcionan solo con la cookie, sin access token.
   `POST /auth/cambiar-password` (no `cambiar-clave`) exige el access token y recibe `passwordActual` y
   `passwordNueva`.
2. El refresh devuelve el mismo cuerpo que el login, **hereda el vencimiento** (la sesión nunca pasa de 8 h)
   y lee rol, sede y `cpw` de la base. Un usuario inactivo pierde sus sesiones en el refresh; uno bloqueado
   por intentos, no.
3. **Reuso** de un refresh ya rotado (también la carrera de dos refresh simultáneos): se revocan todas las
   sesiones del usuario y se registra la acción nueva **`REUSO_SESION`** (S0.7 prevé ampliar la lista).
   _Reemplazado por DEC-026 (2026-10-14): ventana de gracia para el token recién rotado cuya cadena sigue vigente._
4. El cambio de contraseña revoca todas las sesiones y emite una nueva con `cpw: false`. La nueva debe ser
   distinta de la actual y cumplir DEC-011. Tiene su propio conteo de rate limit (10/min por IP).
5. **`autenticar`** (módulo `seguridad`) verifica el Bearer (solo HS256, emisor `siset`) sin consultar la
   base, deja la sesión en `res.locals` y el usuario en el contexto de la petición. S1.6 lo reutiliza.
6. Logout siempre responde 204; la cookie se borra en logout y en todo refresh rechazado.

## DEC-015 — Autorización: política del PRD, tipada, y `cpw` obligatorio

**Fecha:** 2026-10-13 · **Fuente:** SDD de S1.6 v1.1 (aprobado) + respuestas D-08 y D-16 · **Estado:** activa

1. La política inicial es la **matriz RBAC del PRD §2** (recurso × acción), no `PERMISOS_RUTA` del prototipo.
   Diferencias con el prototipo, para que las revisen Coordinación y Kardex (D-16): SEC_DIR no ve
   requisitos; COORDINADOR puede leer pases; "Firma y entrega" se modelará como `hojas-ruta`/`editar` en S3.x.
2. **EGRESADO no tiene permisos**: los egresados no tendrán cuenta (D-08).
3. La política vive en `politica.ts`, tipada (enmienda de ADR-0002).
4. Con `cpw: true`, toda ruta con `autorizar` responde 403 `CAMBIO_PASSWORD_REQUERIDO`.
5. Lo ajeno responde 403. Las denegaciones van al log de pino, no a la bitácora.
6. `GET /auth/mis-permisos` es la fuente del menú de la web (S1.11).

## DEC-016 — Tablas del file y catálogo de requisitos por año y nivel

**Fecha:** 2026-10-13 · **Fuente:** SDD de S2.1 v1.1 (aprobado) + respuesta de D-04 · **Estado:** activa

1. S2.1 crea `file_academico`, `requisito_file` y `requisito_tipo`. **No** crea `matricula` ni
   `resultado_anual` (esperan D-07, S2.3) ni `tipo_tramite`/`tipo_tramite_requisito` (esperan D-21/D-05, S3.x).
2. **Catálogo con una fila por requisito concreto**, con `anio_formacion` y `nivel` (D-04): `TACFI_1`, `TACFI_2`,
   `TCLO_BASICO`, `TCLO_INTERMEDIO`, `TCLO_AVANZADO` y `CERT_NOTAS`. Supone una defensa del TCLO por año
   (repregunta D-04b). Agregar requisitos (D-18, unos 30) no cambia el esquema. El nivel ya no va en
   `requisito_file`.
3. Enums de PostgreSQL para la condición del estudiante, el estado del requisito y el nivel del TCLO.
4. `codigo_estudiante` es texto libre y único hasta conocer el formato de la escuela (D-13b).
5. El seed no pisa requisitos editados por Kardex. La web (`TACFI`, `TCLO`, `CERT_NOTAS`) se alinea en S2.10.

## DEC-017 — Rol de BD de la app, convención de paginación y consulta de la bitácora

**Fecha:** 2026-10-13 · **Fuente:** SDD de S6.4 (aprobado) · **Estado:** activa

1. **La API se conecta como `siset_app`**: lee y escribe las tablas de negocio, pero en `log_auditoria` solo
   `SELECT` e `INSERT`, y no ve `_prisma_migrations`. Las migraciones y el seed siguen con el dueño (`siset`).
   La contraseña la pone el despliegue (`npm run bd:rol-app`, con `APP_DB_PASSWORD`); el repo solo crea el rol
   `NOLOGIN`. Toda tabla nueva de solo inserción repite el `REVOKE` en su migración. Cierra DEC-008 #2.
2. **Convención de paginación de la API:** `?pagina=&porPagina=` (máx. 100, por defecto 50) →
   `{ datos, pagina, porPagina, total }` (`compartido/http/paginacion.ts`).
3. **`GET /api/v1/auditoria`** (solo KARDEX): filtros por usuario, módulo, acción, fechas (hora de La Paz,
   inclusivas) y entidad + id; orden `fecha DESC, id DESC`. Consultar la bitácora no genera eventos.
4. Índice `(entidad, entidad_id, fecha DESC)` para el historial de un registro.

## DEC-018 — Respuestas de la hoja del 2026-10-13: qué cambia

**Fecha:** 2026-10-13 · **Fuente:** hoja "SISET — Preguntas para la escuela" + responsable del proyecto · **Estado:** activa

1. **Doble verificación (D-03): sí, con app TOTP** (código de 6 dígitos, app gratuita; sin servidor de correo).
   Se exige **desde el sistema completo**, cuando entren los estudiantes; el piloto de noviembre es solo con el
   personal (DEC-009). Ticket nuevo en el Sprint 2, unas 8–10 h.
2. **Intentos con un CI inexistente (D-26): se registran** en la bitácora con `usuario_id` nulo y el CI
   intentado en `entidad_id` (nunca la contraseña) y `datos_despues = { motivo: 'CI_INEXISTENTE' }`. Cambia
   DEC-012 #1 / S1.3. Implementado en S1.3b.
3. **Egresados sin cuenta (D-08):** sus trámites son externos; el seguimiento será público (N.º de trámite + CI).
   Aplicado en DEC-015 (EGRESADO sin permisos).
4. **El Coordinador solo firma (D-11):** no hay un dictamen como decisión propia. El módulo de dictamen
   (S4.x) se replantea como paso de firma; se revisa en el SDD de S4.x, sin efecto en el piloto.
5. **Kardex no carga notas (D-07):** las cargan los docentes en un sistema del Ministerio. La respuesta quedó
   incompleta; se repreguntó (D-07b). S2.3 sigue esperando.
6. **Catálogo de requisitos por año y nivel (D-04):** 2 TACFI (1.º y 2.º) y TCLO con niveles básico, intermedio
   y avanzado de 1.º a 3.º. Aplicado en S2.1 v1.1. Se repreguntó si son 1 o 3 defensas por año (D-04b).
7. Confirmadas las propuestas de **D-09** (sin hoja de ruta de estudiantes), **D-16** (validan Coordinación y
   Kardex), **D-24** (una sede por persona; Coordinación y Kardex en Ancocagua) y **D-25** (CI como usuario).
8. **Repreguntas agregadas a la hoja:** D-07b, D-12b (¿aceptan un servidor externo?), D-04b, D-13b (formato de
   los 152 files) y D-14b (quién restablece contraseñas).

## DEC-019 — Respuestas de la hoja del 2026-10-14 (repreguntas y últimas dudas)

**Fecha:** 2026-10-14 · **Fuente:** hoja "SISET — Preguntas para la escuela" (D-04b, D-07b, D-12b, D-13b, D-14b, D-15, D-19, D-20, D-22, D-27) · **Estado:** activa

1. **Servidor externo autorizado (D-12b):** la escuela ya tiene la autorización. El piloto puede usar datos
   reales en un servidor en la nube. El despliegue (S0.12/S0.13) sigue esperando el flujo completo de un rol.
2. **Kardex restablece las contraseñas (D-14b):** confirma la propuesta. No hay recuperación por correo en v1.0.
3. **Una defensa del TCLO por año (D-04b):** confirma DEC-016 #2. Si se reprueba o no se presenta, queda
   **pendiente** y se programa al año siguiente junto con la del año en curso; la defensa fuera de fecha solo vale
   antes de la defensa de diseño metodológico. S2.x debe permitir requisitos pendientes de años anteriores.
4. **Reprobar no repite requisitos ni bloquea por sí solo (D-07b):** quien reprueba no retoma TACFI ni TCLO. El
   **bloqueo** del estudiante lo causa el **permiso obligatorio por una gestión** (por reprobación o porque no
   existe su especialidad) y dura hasta que una resolución defina su situación. Cambia la propuesta provisional
   de D-07 (bloqueo por resultado anual); se aplica en el SDD de S2.3.
5. **Carga manual de los 152 files (D-13b):** los registra el responsable de Sistemas y Archivo Kardex de
   Ancocagua. La carga masiva por Excel (S2.8) deja de ser necesaria para el piloto.
6. **Confirmadas las propuestas de D-15** (2 sedes, Kardex en Ancocagua; la ESFM también tiene la UA Corpa, que
   sería una sede más si entra después), **D-19** (sin alertas en v1.0), **D-22** (sin escaneos) y **D-27**
   (administra el Responsable de Sistemas y Archivo Kardex de Ancocagua; sin rol ADMIN).
7. **Panel del Coordinador (D-20):** solo trámites en cola o entregados, y los que esperan su firma o visto
   bueno. Reduce los KPIs de RF-13 para ese rol; se aplica en el SDD de S6.x. La línea base de tiempos queda sin
   respuesta: se mide a mano durante el piloto si hace falta para la tesis.
8. La escuela ya respondió todas las preguntas de la hoja. Solo quedan abiertas las 4 dudas internas.

## DEC-020 — API de usuarios del personal

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.8 v1.1 (aprobado) · **Estado:** activa

1. `/api/v1/usuarios` crea solo cuentas del **personal** (SEC_DIR, SEC_COORD, COORDINADOR, KARDEX). Las de
   estudiantes llegan con el file y la doble verificación (S2.15); los egresados no tienen cuenta (D-08).
2. **El sistema genera la contraseña temporal** (12 caracteres, cumple DEC-011, sin caracteres ambiguos) y la
   devuelve una sola vez. Restablecer genera otra, obliga a cambiarla, quita el bloqueo y cierra las sesiones.
   Lo hace Kardex (D-14b).
3. **El CI no se edita**: es el usuario (D-25). Si está mal, se da de baja la cuenta y se crea otra.
4. Kardex no puede darse de baja ni quitarse el rol, y **el sistema nunca queda sin un KARDEX activo**
   (`ULTIMO_KARDEX`, verificado con un bloqueo de transacción para que dos bajas simultáneas no lo salteen).
5. Acción nueva de bitácora: **`DESBLOQUEAR_CUENTA`**. `EDITAR` guarda solo los campos que cambiaron; una
   edición sin cambios reales no escribe ni registra nada.
6. Si el CI ya es de una persona sin cuenta, **se reutiliza esa persona sin cambiar sus datos**.

## DEC-021 — Login, cambio de contraseña y sesión real en la web

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.9 y S1.10 (aprobados) + responsable del proyecto · **Estado:** activa

1. **La web nunca dice "cuenta bloqueada":** muestra el 401 genérico de la API (DEC-012/013) y un aviso fijo, sin
   números, de que varios intentos bloquean la cuenta. El mock se alinea con la API.
2. **P-03 pide la contraseña actual** (contrato de DEC-014); la web no guarda la contraseña escrita en el login.
   `authService.cambiarClave` pasa a `cambiarPassword` y devuelve el usuario de la sesión nueva.
3. **La sesión se restaura con `POST /auth/refresh` al arrancar.** La web no guarda ni el id ni el token; solo la
   hora de la última actividad, en `localStorage`.
4. **El refresh es de vuelo único** por pestaña y usa un Web Lock (`siset-refresh`) entre pestañas, para no disparar
   el reuso de DEC-014 #3. Un 401 reintenta una sola vez; si el refresh falla, la sesión se pierde y se vuelve al
   login con el motivo.
5. **Inactividad:** 15 min (RNF-02), aviso 60 s antes, compartida entre pestañas y revisada también al arrancar. Las
   peticiones a la API no cuentan como actividad. El cierre usa `POST /auth/logout` (`LOGOUT` en la bitácora).
6. **Contrato de `useAuth()`** del SDD de S1.10 §2.1, con `cambiarPassword` y `motivoCierre`; el contexto vacía la
   caché de React Query al iniciar, cerrar o perder la sesión.
7. **La inactividad también la controlará la API** (rechazar el refresh tras 15 min sin latido de la web): ticket
   aparte (S2.16, ClickUp 868mhbkd8) después del piloto, decidido por el responsable.

## DEC-022 — La web arma rutas y menú con la política de la API

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.11 v1.1 (aprobado) · **Estado:** activa

1. **La web no guarda roles por pantalla.** Cada ruta declara el permiso `{ recurso, accion }` que exige
   (`PERMISO_RUTA` en `apps/web/src/config/permisos.ts`) y quién lo tiene lo dice `GET /auth/mis-permisos`.
   Inicio y Mi perfil solo piden sesión.
2. **Una bandeja de trabajo exige la acción que se hace en ella** (`pases/crear`, `dictamenes/crear`); una alta o
   edición exige `crear` o `editar`; el detalle hereda el permiso de su lista.
3. **Mock y API usan la misma matriz** (`mocks/politica.ts`, con test de paridad contra la de la API). El modo de
   los permisos sigue al de `auth`.
4. Sin permiso → **P-04 en la misma URL**. Si no se pueden cargar los permisos, se falla cerrado con Reintentar.
5. Un **403 de la API en una llamada de datos** se muestra como error de la pantalla, no navega a P-04.
6. **Firma y entrega es de SEC_DIR** (respuesta del responsable). Su permiso se agrega a la política en S3.x;
   mientras tanto la web usa `hojas-ruta/crear` como puente.
7. El **EGRESADO** (sin permisos, D-08) queda con Inicio y Mi perfil, también en la demo. Su usuario de prueba y su
   inicio se quitan en S1.12.

## DEC-023 — Pantalla de usuarios conectada a la API

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.13 (aprobado) + responsable del proyecto · **Estado:** activa

1. **El mock de cada servicio que pasa a la API imita su contrato** (tipos, códigos de error y paginación): la
   pantalla es una sola en los dos modos.
2. **P-47 muestra la contraseña temporal una sola vez**, en un modal que solo se cierra con un botón explícito
   (`Modal` suma `cerrable={false}`), y no la guarda en ningún lado. En modo demo la temporal es `CLAVE_DEMO`.
3. **P-47 es la primera pantalla con TanStack Query:** claves por recurso (`['usuarios', filtros]`), invalidación
   al escribir y la página anterior visible mientras carga la siguiente (paginación en el servidor, con el
   `Paginacion` compartido con S6.5).
4. Los errores `VALIDACION` de la API se muestran debajo de cada campo, usando `detalles[].ruta`.
5. Decisiones del responsable: cuando lleguen las cuentas de estudiantes (S2.x) aparecerán en P-47 sin "Editar",
   y Kardex podrá restablecer, desbloquear y dar de baja; el correo sigue opcional.

## DEC-024 — Pantalla de bitácora conectada (P-48)

**Fecha:** 2026-10-14 · **Fuente:** SDD de S6.5 v1.1 (aprobado) · **Estado:** activa

1. Los servicios de la web exponen **el contrato de la API también en modo mock**. El mock de la bitácora traduce
   al leer y no cambia el almacén del prototipo (`db.bitacora`), que escriben los servicios mock de otros tickets.
2. Las listas cerradas de acciones y módulos se copian a la web (`config/auditoria.ts`) con su etiqueta en
   español, y un test las mantiene iguales a las de la API. Un código desconocido se muestra tal cual.
3. P-48 pagina en el servidor (50 por página, con el paginador compartido) y guarda los filtros en la URL.
4. El filtro por usuario usa `GET /usuarios?texto=` más el atajo de clic en la fila; no hay filtro "sin usuario".
   Clic en "Registro afectado" filtra el historial de ese registro (entidad + id, DEC-007 #4).
5. Las fechas de la bitácora se muestran siempre en hora de La Paz, con segundos.
6. **Ticket técnico pendiente:** los intentos con un CI inexistente (DEC-018 #2) usan `entidad = 'usuario'` con el
   CI en `entidad_id`, mezclado con los ids de usuario. La pantalla los distingue; el arreglo de fondo es
   registrarlos con una entidad propia (por ejemplo `ci_intentado`).

## DEC-025 — Pruebas de acceso: matriz HTTP, cobertura y E2E contra la API real

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.14 v1.1 (aprobado) + responsable del proyecto · **Estado:** activa

1. **Matriz HTTP:** cada ruta real de `/api/v1` × los 6 roles, sin token, token inválido y `cpw`. Las celdas
   rechazadas corren sin base (job `calidad`) y las permitidas, con base (`base-de-datos`). Un **guardián**
   compara la matriz con `openapi.json`: una ruta nueva sin su fila hace fallar el CI.
2. **Recorrido de aceptación de la API:** con el Kardex del seed, de `cpw` a crear un SEC_DIR, 403, bloqueo,
   desbloqueo y logout, revisando la secuencia de eventos en la bitácora.
3. **Cobertura** de `src/modulos/seguridad` ≥ 70 % en el job `base-de-datos` (`test:cobertura`, DoD del PRD §6).
4. **E2E contra la API real** (proyecto Playwright `api-real`, `E2E_API_REAL=1`): el job `e2e` suma PostgreSQL,
   migraciones y seed. La preparación crea por la API una cuenta por rol, de forma idempotente. Los nombres de
   los checks no cambian; el job `docker` no cambia.
5. PI-01 y CPA-01 se cubren con la inferencia del ticket, confirmada por el responsable.
6. **Hallazgo:** navegar o recargar mientras un refresh está en vuelo puede perder la cookie rotada; la siguiente
   carga se toma como reuso (DEC-014 #3) y se cierran todas las sesiones del usuario. Ticket S1.15 (ClickUp 868mhch6a; API: tolerar
   por unos segundos el token recién rotado).

## DEC-026 — Refresh con ventana de gracia (reemplaza DEC-014 #3)

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.15 v1.2 (aprobado) + ADR-0004 · **Estado:** activa

1. Un refresh con un token **revocado por rotación** hace ≤ `SEG_GRACIA_REFRESH` s (10, en `parametro`) no es
   reuso si su **cadena de rotación termina en un token vigente**: se revoca ese último, se emite uno nuevo con el
   mismo vencimiento y toda la cadena apunta al nuevo; si otra petición gana la carrera, se reintenta (hasta 10).
   Cubre la recarga con un refresh en vuelo, las cargas abortadas que llegan tarde y los refresh simultáneos.
2. Fuera de la ventana, o si la cadena terminó en logout, cambio de contraseña, baja o reuso, el reuso sigue
   igual: todas las sesiones revocadas y `REUSO_SESION`.
3. `refresh_token.reemplazado_por_id` (FK `SET NULL`, segunda excepción a DEC-006) marca la revocación por rotación.
4. El arreglo es de la API; la web no cambia. E10 (`api-real`) lo prueba: falla 3 de 3 veces sin la gracia.

## DEC-027 — API de files

**Fecha:** 2026-10-14 · **Fuente:** SDD de S2.2 (aprobado) + respuestas D-07b, D-13b, D-15 y D-24 · **Estado:** activa

1. Módulo **`files`** con `/api/v1/files`: crear, ver, editar y listar paginado (texto en CI, código y nombre;
   especialidad, año, condición y bloqueo). La persona se crea o se reutiliza en la misma transacción (patrón de
   DEC-020). KARDEX crea y edita; el personal lee (DEC-015).
2. **Quedan fuera:** el bloqueo (sigue D-07b y va en S2.3), los requisitos (S2.4), "mi file" (S2.7) y la cuenta
   del estudiante (S2.15). El file se crea desbloqueado y el PATCH no acepta el bloqueo.
3. **El file no tiene sede:** todos los estudiantes son de Ancocagua (D-24, D-15). No se aplica `exigirSede`. Si
   entra la UA Corpa, el file necesitará la columna.
4. `GET /api/v1/catalogos/especialidades` (solo activas), con permiso `files`/`leer`.
5. El código de estudiante sigue obligatorio (DEC-016 #4) hasta la respuesta de **D-28**, en la hoja desde el
   2026-10-14. Si no hay respuesta antes de que Kardex cargue los files, se vuelve opcional.

## DEC-028 — Búsqueda, detalle y formulario de files conectados

**Fecha:** 2026-10-14 · **Fuente:** SDD de S2.9-S2.10 (aprobado) · **Estado:** activa

1. **El servicio de files de la web se parte en dos:** `files.service` con el contrato de la API (P-40, P-41 y
   P-42) y `files-prototipo.service` para las otras 10 pantallas hasta su ticket. El mock del primero lee y
   escribe el mismo almacén que el prototipo, así que en la demo un file nuevo aparece en todas las pantallas.
2. Con la API, P-41 oculta matrículas, resultados, requisitos, trámites y el bloqueo, con un aviso, y P-40 oculta el
   semáforo. En la demo siguen como en el prototipo (`SeccionesDemoFile`).
3. El formulario del file ya no crea la cuenta del estudiante (llega con S2.15).
4. Errores por campo con una utilidad común (`lib/formularios.ts`) para usuarios y files. `CabeceraFile` recibe
   los datos ya armados; el semáforo es opcional.

## DEC-029 — Bloqueo del file por permiso obligatorio

**Fecha:** 2026-10-14 · **Fuente:** SDD de S2.6 (aprobado) + respuesta D-07b · **Estado:** activa

1. Kardex bloquea y desbloquea el file a mano: el bloqueo pide un **motivo** (el permiso obligatorio por una
   gestión, D-07b) y el desbloqueo, el **número de la resolución**. No hay bloqueo automático por UF reprobadas.
   Se corrigieron RF-07 (M2, CA2 y CA3) del PRD y `business-rules.md`.
2. La resolución queda en la bitácora (`DESBLOQUEAR`), no en el file: sin migración. Acciones nuevas `BLOQUEAR` y
   `DESBLOQUEAR` (`POST /files/:id/bloqueo` y `/desbloqueo`, solo KARDEX).
3. El motivo y la resolución son texto libre hasta la respuesta de **D-29**. Las matrículas esperan **D-30**; el
   viejo S2.3 (resultados anuales) no aplica.

## DEC-030 — Requisitos del file

**Fecha:** 2026-10-14 · **Fuente:** SDD de S2.4 (aprobado) + respuestas D-04, D-04b y D-07b · **Estado:** activa

1. `GET /files/:id/requisitos` (el catálogo activo con el estado de cada requisito; sin registro = PENDIENTE) y
   `PUT /files/:id/requisitos/:codigo` (solo KARDEX). COMPLETO exige fecha; OBSERVADO exige observación: es la
   defensa del TCLO reprobada o no presentada, que se reprograma (D-04b). Quien registra lo pone la API.
2. Cada cambio se registra como `EDITAR` del file, con el código del requisito y solo lo que cambió: aparece en el
   historial del file.
3. `GET /catalogos/requisitos` con permiso `requisitos`/`leer`. Administrar el catálogo queda para cuando llegue
   la lista de D-18.
4. La pestaña Requisitos de P-41 está conectada en los dos modos (agrupada por año). SEC_DIR no la ve (DEC-015).
   Se borraron la pestaña de requisitos del prototipo y su modal.

## DEC-031 — Semáforo del file calculado en la API

**Fecha:** 2026-10-14 · **Fuente:** SDD de S2.5 v1.1 (aprobado) · **Estado:** activa (regla provisional hasta D-31)

1. El semáforo se calcula en la API y no se guarda. Solo cuentan los requisitos obligatorios y activos.
   **Rojo:** file bloqueado o algún requisito OBSERVADO. **Amarillo:** alguno pendiente. **Verde:** todos completos.
2. `semaforo` en `FileDetalle` y filtro `GET /files?semaforo=`. La web lo muestra en la búsqueda (columna y filtro)
   y en la cabecera de P-41, en los dos modos. El rojo sin bloqueo se muestra como "Requisito observado".
3. La regla vive en la API y en la web (para el mock); una tabla de casos común las mantiene iguales.
4. Cuándo un requisito pendiente pasa a "atrasado" (rojo) lo define **D-31**, en la hoja desde el 2026-10-14.

## DEC-032 — Inicio de Kardex con datos reales y sin cuentas de egresado

**Fecha:** 2026-10-14 · **Fuente:** SDD de S1.12 (aprobado) + D-08 · **Estado:** activa

1. El inicio de Kardex (P-15) lee los files de `filesService`: total, bloqueados, en rojo y la lista de los que
   están en rojo ("File bloqueado" o "Requisito observado"). Con la API oculta los indicadores y accesos de
   trámites, pases e impresiones hasta S3.x–S5.x; en la demo siguen.
2. La demo ya no tiene cuentas de egresado, ni la ruta `/egresado`, ni su inicio (D-08). El rol sigue existiendo
   sin permisos (DEC-015 #2) y su inicio apunta a `/seguimiento`. Cierra DEC-022 P2.
3. Los inicios de SEC_DIR, SEC_COORD, COORDINADOR y del estudiante se conectan con S3.x y S2.7.

## DEC-033 — Módulo de hojas de ruta: dos flujos según el valorado

**Fecha:** 2026-10-14 · **Fuente:** brief del módulo (`docs/planning/2026-10-14 - Brief-modulo-hojas-ruta.md`), aprobado por el responsable + respuestas D-05, D-08, D-09, D-11, D-20 y D-21 · **Estado:** activa (provisional en lo que dependa de D-32 a D-35)

1. Reemplaza el flujo único de 11 estados del prototipo y de `business-rules.md`. Hay **dos flujos** según el tipo:
   **con valorado** (historial académico, legalización de historial): Recibido → Avisado a Kardex → En impresión →
   Impreso → Firma de Dirección Académica → Firma de Dirección General → Listo → Entregado; **sin valorado**
   (certificados de notas y de excelencia de años pasados): Recibido → Avisado a Kardex → En impresión → Firma del
   Coordinador → Remitido a Calahumana → Listo → Entregado.
2. Los **4 tipos** de trámite de D-21, con `requiere_valorado`. Solo trámites de egresados (D-09), sin cuenta (D-08).
3. **No hay dictamen** (D-11): S4.7 y S4.9 pasan a ser el paso "Firma del Coordinador". **S4.5** ("Mis trámites")
   se elimina. **S3.6, S3.10** (pases) y **S4.6** (revisión de Kardex) esperan D-34 y D-35; mientras tanto, sin
   estado Observado y sin bandeja de pases.
4. Los pasos que ocurren en Calahumana los anota Secretaría de Dirección (provisional, D-33). Un file bloqueado
   impide registrar e imprimir (DEC-029).
5. Orden: S3.1 + S3.3 (un SDD) → S3.2 → S3.4 + S3.8 + S3.9 → S3.5 → S4.1–S4.3.

## DEC-034 — Tablas de hojas de ruta y máquina de estados

**Fecha:** 2026-10-14 · **Fuente:** SDD de S3.1-S3.3 (aprobado) + ADR-0005 · **Estado:** activa

1. Tablas `tipo_tramite` (los 4 tipos de D-21 con `requiere_valorado`, sembrados en la migración), `hoja_ruta` y
   `movimiento_hoja_ruta` (solo inserción, con `REVOKE` para `siset_app` y un trigger que actualiza la hoja). No se
   crean `pase` ni `dictamen`; `modelo-datos.md` se actualizó.
2. La máquina de estados es la tabla de ADR-0005: dos flujos, rol y sede por paso; el bloqueo del file impide los
   pasos hasta imprimir. `business-rules.md` §Hoja de ruta se reescribió.
3. `POST /hojas-ruta/:nro/transiciones` (409, 403, 422) y `GET /hojas-ruta/:nro` con los movimientos y las acciones
   posibles para quien pregunta. La ingesta y el correlativo llegan con S3.4 y S3.2.

## DEC-035 — Correlativo, ingesta y lista de hojas de ruta

**Fecha:** 2026-10-14 · **Fuente:** SDD de S3.2-S3.4 (aprobado) + ADR-0006 · **Estado:** activa (la regla de egresados es provisional, D-09)

1. Correlativo `HR-AAAA-NNNNNN` por gestión (año en La Paz) con `fn_siguiente_nro_hoja_ruta`, dentro de la
   transacción de la ingesta: sin huecos ni repetidos. ADR-0006.
2. `POST /hojas-ruta`: SEC_DIR desde LA_PAZ; valorado obligatorio solo si el tipo lo requiere, y prohibido si no;
   el file debe existir, ser de un egresado y no estar bloqueado. Deja `RECIBIDO` con el movimiento `REGISTRAR` y el
   evento `CREAR`.
3. `GET /hojas-ruta` paginado (más recientes primero) con filtros por N.º, CI o nombre del titular, estado, tipo y
   gestión.

## DEC-036 — Despliegue de prueba en Coolify

**Fecha:** 2026-10-14 · **Fuente:** SDD de S0.12 (aprobado, v1.1) + pedido del responsable · **Estado:** activa

1. Entorno de prueba en `https://siset.vertexall.com`: servicio docker-compose de Coolify con la forma de Ventas
   Fácil (`db`, `migrar`, `api`, `web`), creado por la API de Coolify. Cloudflare es solo DNS; el certificado lo
   saca Traefik. Reemplaza el despliegue manual de S0.9 para este entorno.
2. Imágenes públicas en GHCR (`siset-api`, `siset-migrar`, `siset-web`), publicadas a mano por el workflow
   _Publicar imágenes_ con las etiquetas `prueba` y `AAAA.MM.DD-sha`.
3. Datos ficticios e idempotentes (`bd:datos-prueba`, solo con `DATOS_PRUEBA=1`): 3 del personal, 30 files y 8 hojas
   de ruta. Contraseñas generadas por Coolify, con prefijo para cumplir DEC-011. Sin respaldos: no es producción.
   Runbook: `docs/despliegue/prueba-coolify.md`.

## DEC-037 — Ingesta, lista y detalle de hojas de ruta conectados

**Fecha:** 2026-10-15 · **Fuente:** SDD de S3.8-S3.9 (modo demo: implementado sin aprobación previa, ver
`docs/proceso/modo-demo.md`) · **Estado:** activa

1. El servicio de hojas de ruta de la web se parte: `hojasRuta.service` con el contrato de la API (P-30, P-31 lista y
   detalle, datos de P-32) y `hojasRuta-prototipo.service` para el resto de las pantallas hasta su ticket.
2. El mock de la demo usa el modelo nuevo (`mocks/hojas-ruta-v2.ts`) con una copia de la tabla de transiciones en
   `lib/maquina-hojas-ruta.ts`; la de la API manda.
3. El detalle muestra las acciones que manda la API; la ingesta ofrece "Registrar y avisar a Kardex"; los filtros de
   la lista son los de la API (texto, estado, tipo, gestión) y la marca "detenido" sale de la lista.
4. `GET /hojas-ruta/tipos` es el catálogo de tipos de trámite.
5. La cuenta SEC_DIR del E2E contra la API real queda en LA_PAZ (la ingesta es de Calahumana).

## DEC-038 — Seguimiento público del trámite

**Fecha:** 2026-10-15 · **Fuente:** RF-09 (modo demo, sin SDD previo) · **Estado:** activa

1. `POST /api/v1/seguimiento` sin sesión, con `{ nro, ci }` en el cuerpo (el CI no queda en la URL ni en los logs).
   Responde el nombre del titular, el tipo, el estado, la sede actual y los pasos (estado, sede, fecha), sin quién
   hizo cada paso (RF-09 CA3).
2. El mismo 404 si no existe el N.º o si el CI no es del titular (anti-enumeración). El CI se acepta con o sin
   complemento.
3. Límite por IP igual al del login (`LOGIN_LIMITE_POR_MINUTO`, RNF-10). La consulta no se registra en la bitácora:
   no es una escritura ni un evento de acceso del personal.
4. La página P-02 (a la que apunta el QR) usa el modelo nuevo y ya no muestra la barra de progreso del prototipo.
