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

## DEC-039 — Reportes de trámites e inicio de Secretaría de Coordinación

**Fecha:** 2026-10-15 · **Fuente:** RF-13 (modo demo, sin SDD previo) · **Estado:** activa

1. `GET /api/v1/reportes/hojas-ruta` (`reportes`/`leer`: SEC_DIR, COORDINADOR, KARDEX) en el módulo `hojas-ruta`, dueño
   de las tablas. Filtros: fecha de ingreso (días de La Paz) y tipo. Devuelve totales, por estado, por tipo, por mes
   (6 meses), días promedio en cada estado y los detenidos.
2. Detenido: en curso y sin movimiento hace más de 10 días (el ⚠ del prototipo). Tiempo promedio: de ingreso a
   entrega, solo los entregados. Se calcula en la API sobre los trámites filtrados (cientos en el piloto); con más
   volumen pasará a consultas agregadas (S6.1).
3. Sin "Exportar PDF/Excel" por ahora: eran simulados; quedan para S6.3. Ya no se filtra por sede.
4. SEC_COORD no registra pasos en el flujo de DEC-033: su inicio muestra, solo para ver, lo que está en Ancocagua
   (en impresión, impresos por firmar, por remitir) y los últimos trámites.

## DEC-040 — Firmas del Coordinador en lugar de dictámenes

**Fecha:** 2026-10-15 · **Fuente:** D-11 (respondida), DEC-033 (modo demo, sin SDD previo) · **Estado:** activa

1. No hay dictamen: el Coordinador solo firma (D-11). La pantalla P-50 "Dictámenes" del prototipo pasa a ser
   **"Firmas"** (`/firmas`): pestaña "Esperan tu firma" (certificados `IMPRESO` de los tipos sin valorado) y
   "Firmados" (de `FIRMADO_COORDINADOR` en adelante). "Firmar" registra el paso `FIRMA_COORDINADOR` con
   `POST /hojas-ruta/:nro/transiciones`, con observación opcional; la bitácora la registra la API (DEC-007).
2. Sin endpoint nuevo: la pantalla arma las listas con `GET /hojas-ruta` por tipo y estado.
3. El menú usa el permiso `dictamenes`/`crear` de la política porque solo el COORDINADOR lo tiene; renombrar el
   recurso exige tocar la política de Casbin (ADR-0002) y queda para después de la presentación.
4. Se borran `EmitirDictamen` (`/dictamenes/:nro`) y `dictamenesService`. El Coordinador no devuelve certificados
   (D-37, propuesta). Las pantallas de Kardex "Revisión" y "Emisión" siguen con el prototipo que menciona el
   dictamen hasta su propio flujo.

## DEC-041 — Recojo, impresión y remisión de Kardex contra la API

**Fecha:** 2026-10-15 · **Fuente:** D-34 y D-39 (propuestas), DEC-033 (modo demo, sin SDD previo) · **Estado:** activa

1. P-43 "Revisión de trámites" pasa a **"Recojo y remisión"** (pestañas Por recoger = `AVISADO_KARDEX` y Por
   remitir = `FIRMADO_COORDINADOR`) y P-44 "Emisión de documentos" pasa a **"Impresión"** (Por imprimir =
   `EN_IMPRESION` e Impresos = `IMPRESO`). Las dos usan `BandejaKardex`: lista por estado y un panel con el
   titular, los requisitos obligatorios del file y los pasos que manda la API (`RECOGER`, `IMPRIMIR`, `REMITIR`),
   con observación opcional.
2. Sin revisión aparte ni "Observado" (D-34, propuesta): el file bloqueado impide recoger e imprimir.
3. SISET no genera el documento: Kardex imprime como hoy y el sistema anota el paso `IMPRIMIR` (D-39, propuesta;
   D-10 sin formatos). Vista previa, N.º de valorado por impresión y reimpresión (S5.x, `documento_emitido`)
   esperan esas respuestas. El N.º de valorado que se ve es el de la ingesta.
4. Se borran `documentosService` y `ModalObservar` del prototipo. Los indicadores del inicio de Kardex llevan a
   estas dos bandejas.

## DEC-042 — Carátula de la hoja de ruta con QR y los pasos del trámite

**Fecha:** 2026-10-15 · **Fuente:** S3.5, RF-08 CA3, D-35 (propuesta) (modo demo, sin SDD previo) · **Estado:** activa

1. La carátula (P-32) lee `GET /hojas-ruta/:nro`. El QR apunta a `/seguimiento?hr=<N.º>` del dominio público
   (`VITE_PUBLIC_URL`, que el workflow de imágenes arma con el dominio); el visitante solo agrega el CI.
2. La tabla "Pases" (De / A) se cambia por **"Pasos del trámite"**: los pasos del flujo del tipo (con o sin
   valorado, DEC-033) en orden, con sede y responsable; los ya registrados salen con quién y la fecha, y todos
   dejan espacio para firma y sello en papel. Sin pases entre oficinas (D-35, propuesta).
3. "PDF imprimible" = imprimir desde el navegador (también "Guardar como PDF"): solo sale la hoja carta, sin el
   menú ni la cabecera (zona de impresión). Un PDF del servidor no hace falta para la carátula.

## DEC-043 — "Mi file" del estudiante contra la API (S2.7)

**Fecha:** 2026-10-15 · **Fuente:** S2.7, ADR-0002, D-07, D-30 (propuesta) (modo demo, sin SDD previo) · **Estado:** activa

1. `GET /api/v1/files/mio` (`files`/`leer_propio`) y `GET /api/v1/files/mio/requisitos` (`requisitos`/`leer_propio`):
   solo ESTUDIANTE. No reciben id: el file sale de la persona del usuario de la sesión (la raíz pasa
   `personaDeUsuario` desde seguridad), así que "propio" se valida en el servicio (ADR-0002). Sin file: 404 con
   "Consulta con Kardex". Las rutas por id siguen siendo solo del personal (403 para el estudiante). Leer no es
   escritura ni evento de acceso: sin bitácora (DEC-007).
2. P-20 "Mi file" (cabecera con semáforo, pestañas Requisitos y Mis datos, solo lectura) y P-10 Inicio del
   estudiante (semáforo, requisitos obligatorios y alertas: bloqueo, observados y pendientes) leen esos endpoints.
   Sin matrículas ni notas: no se registran en SISET (D-30, propuesta; las notas están en el sistema del Ministerio,
   D-07).
3. Datos de prueba: cuenta de estudiante `8100024` (file PRB-0024, ficticio, en amarillo) con la contraseña común. Se crea con
   `asegurarEstudiantePrueba` en cada corrida de `bd:datos-prueba`, aparte de la carga inicial, porque en la prueba
   los datos ya estaban cargados. Ajusta DEC-032: el login de prueba muestra el personal y un estudiante, sin
   egresados (D-08).

## DEC-044 — Menú sin pantallas del prototipo y campana de avisos contra la API

**Fecha:** 2026-10-15 · **Fuente:** D-36 y D-13b (propuestas) (modo demo, sin SDD previo) · **Estado:** activa

1. Salen del menú "Bandeja de pases" y "Firma y entrega" (D-35, D-36: los pasos y la entrega se registran desde el
   detalle del trámite) y "Carga masiva" (D-13b: Kardex carga los files a mano). Sus rutas y permisos siguen (la
   demo en mock las usa); vuelven al menú cuando se respondan esas dudas.
2. La campana del encabezado lee la API: a cada rol le avisa cuántos trámites esperan un paso suyo (DEC-033) y lo
   lleva a su bandeja o a la lista filtrada; a Kardex, además, los files bloqueados; al estudiante, las alertas de
   su file. Se refresca al registrar un paso y cada minuto. SEC_COORD no registra pasos: sin avisos. Solo con todo
   en mock se usa la campana del prototipo.
3. Repreguntas a la escuela (respuestas incompletas o ambiguas): D-10b, D-18b, D-14c y D-20b (hoja, filas 42–45).

## DEC-045 — Pestaña "Trámites" del file y egresados sin file (D-40)

**Fecha:** 2026-10-15 · **Fuente:** D-09, D-40 (propuesta) (modo demo, sin SDD previo) · **Estado:** activa

1. Con la API, el detalle del file (P-41) muestra la pestaña **Trámites** a quien lee hojas de ruta: las del titular,
   con su estado, y el detalle al hacer clic. Usa `GET /hojas-ruta?texto=<CI>` y filtra por el file (el texto también
   coincide con otros CI que lo contienen). Sin endpoint nuevo.
2. La ingesta sigue exigiendo un file EGRESADO y sin bloqueo (D-09, DEC-029). Para el egresado de años anteriores sin
   file se preguntó D-40; mientras tanto, Kardex registra su file (datos básicos) antes de que Secretaría registre el
   trámite.

## DEC-046 — Revisión en pantalla de Secretaría de Dirección: sedes, avisos y fecha de entrega

**Fecha:** 2026-10-15 · **Fuente:** recorrido de SEC_DIR con Playwright (modo demo, sin SDD previo) · **Estado:** activa

1. La sede de La Paz se llama **"Calahumana (La Paz)"** en la semilla y en el catálogo de la web (antes "Sede Central
   La Paz", nombre del prototipo); así la nombra la escuela (D-05, D-15). La semilla actualiza el nombre en cada
   despliegue. En las pantallas del personal, Ancocagua se muestra como "UA Ancocagua".
2. El aviso al registrar un paso muestra el estado al que pasó el trámite ("HR-2026-000004: Entregado").
3. Entrega: si la fecha elegida no es hoy, va en la observación del paso ("… el 14/10/2026"). El paso y la fecha de
   cierre quedan con la hora del registro; guardar una fecha de entrega aparte queda para después del piloto.

## DEC-047 — E2E de punta a punta de los dos flujos y CI de nuevo en verde

**Fecha:** 2026-10-15 · **Fuente:** S4.10 (modo demo, sin SDD previo) · **Estado:** activa

1. `e2e/api-real/flujos-completos.spec.ts` (proyecto `api-real`, `E2E_API_REAL=1`): el certificado sin valorado de
   punta a punta (SEC_DIR registra y avisa → Kardex recoge e imprime en sus bandejas → el Coordinador firma en
   "Firmas" → Kardex remite → SEC_DIR confirma la llegada y entrega → seguimiento público sin cuenta → bitácora con
   los 7 cambios de estado); el historial con valorado (el Coordinador no lo ve; SEC_DIR anota las dos firmas y una
   entrega a un apoderado de otro día) y el file bloqueado (no se registra hasta el desbloqueo). 15 pruebas, en
   serie en un worker; los files de los egresados se crean por la API.
2. La CI estaba en rojo desde `9c923a6` (3 E2E del modo mock y 1 de `api-real` desactualizados por DEC-040,
   DEC-041 y DEC-044). Corregidos. Antes de cada push del modo demo se corre también `npm run e2e`.
3. Las pruebas eligen al egresado por su CI en las sugerencias, no la primera fila (la lista se actualiza después
   de escribir y podía elegir a otro).
4. Las fallas intermitentes del login de Kardex no eran un bug: E13 cerraba la sesión de Kardex con una renovación
   en vuelo, y el SDD de S1.5 (§2.2) trata a propósito un token revocado que vuelve a llegar como reuso: cierra
   **todas** las sesiones del usuario, también las de las otras pruebas en paralelo. Es el comportamiento seguro y
   Auth está en `do-not-touch.md`: no se cambia. E13 abre al Coordinador en otra ventana sin cerrar la sesión de
   Kardex. Con eso, la suite completa (86) pasó 4 de 4 corridas seguidas.
5. Las bandejas de Kardex y "Esperan tu firma" tienen buscador (N.º, nombre o CI): paginan de a 10 y, con muchos
   trámites, el que se busca puede no estar en la primera página.
6. Visto al reproducirlo: más de 10 renovaciones simultáneas del mismo token agotan los reintentos de la gracia y
   también cuentan como reuso. La web nunca las manda (un solo refresh en curso y Web Lock entre pestañas, S1.10);
   si hiciera falta, se revisa con un ADR.

## DEC-048 — Guías públicas: manual del personal, guía de estudio del código y preguntas de defensa

**Fecha:** 2026-10-15 · **Fuente:** S6.12 y pedido del autor (modo demo, sin SDD previo) · **Estado:** activa

1. Páginas públicas, sin sesión, enlazadas desde el login: `/guia` (índice), `/guia/manual` (manual por rol,
   preguntas frecuentes y plan de capacitación de 5 sesiones antes del piloto), `/guia/estudio` (dónde está cada
   pieza en el código: hash bcrypt, sesión, permisos, bitácora, notificaciones, máquina de estados, correlativo,
   pruebas) y `/guia/defensa` (preguntas probables del tutor y el tribunal, con la evidencia de cada respuesta).
2. La guía de estudio y las preguntas de defensa son material del autor: se ven en el entorno de prueba
   (`VITE_CUENTAS_PRUEBA`) y en la demo, no en la instalación de la escuela (`guiasDeTesis`). El manual, siempre.
3. Todo dato citado (rutas de archivos, nombres de funciones, parámetros) se verificó contra el código. Si el código
   cambia, se actualizan las guías en el mismo commit.

## DEC-049 — Bloqueo del file: resolución al bloquear, con PDF, por licencia temporal

**Fecha:** 2026-10-16 · **Fuente:** respuesta D-29 (hoja) (modo demo, sin SDD previo) · **Estado:** activa, implementada el 2026-10-16

1. **Los datos se anotan al bloquear**, no al desbloquear: número de la resolución, fecha de la resolución, una
   glosa con el motivo y el **PDF de la resolución**. Cambia DEC-029 #1 y #3 (motivo al bloquear y resolución al
   desbloquear, en texto libre).
2. **Solo hay dos causas de bloqueo:** licencia temporal **obligatoria** y licencia temporal **voluntaria**. En
   ambas se espera que el estudiante se reincorpore. La causa pasa de texto libre a una de esas dos.
3. Es la única excepción a D-22 (no se suben escaneos). Se corrigieron RF-07 del PRD, `business-rules.md` y
   `modelo-datos.md`.
4. La respuesta no dice qué se anota al desbloquear: el desbloqueo no pide datos; quedan quién y cuándo.
5. **Implementación.** Tabla `bloqueo_file` (dueño: files), una fila por bloqueo con la resolución y el PDF en
   `bytea` (entra en los respaldos de la base; nada en el disco del contenedor). Índice único parcial: un bloqueo
   abierto por file. `file_academico.motivo_bloqueo` guarda la glosa (lo leen hojas de ruta y "mi file").
   - `POST /files/:id/bloqueo` recibe `multipart/form-data` (`causa`, `nroResolucion`, `fechaResolucion`, `glosa`
     y el archivo `pdf`) con `multer` en memoria, 5 MB como máximo; el archivo debe empezar con `%PDF-`.
   - `POST /files/:id/desbloqueo` con cuerpo vacío o `{}`. `GET /files/:id/bloqueo` (sin el PDF) y
     `GET /files/:id/bloqueo/pdf`: los lee el personal, como el file.
   - La bitácora guarda causa, resolución, fecha, glosa, nombre y tamaño del PDF, nunca su contenido.
   - Los files bloqueados antes de esta DEC no tienen resolución: se desbloquean igual.
   - En la web, el detalle del file muestra la resolución y el botón "Ver PDF de la resolución" (lo descarga con
     el token y lo abre en otra pestaña).

## DEC-050 — Respuestas de la hoja del 16-oct (D-31 a D-44)

**Fecha:** 2026-10-16 · **Fuente:** hoja de la escuela (D-14c, D-31 a D-44, D-10b) · **Estado:** activa; #4, #5 y #6
implementadas en DEC-052; #2 espera D-32b

1. **Coinciden con lo que hace el sistema** (se cierran sin cambios): D-33 (los pasos en Calahumana los anota
   SEC_DIR), D-34 (Kardex no revisa: imprime a pedido de SEC_DIR), D-37 (el Coordinador no devuelve), D-38 (un paso
   no se deshace), D-39 (SISET no lleva notas; importa el documento físico en el file), D-43 (solo Ancocagua) y
   D-14c (nadie tiene complemento; sigue opcional).
2. **D-32:** los certificados sin valorado (notas y excelencia) también los puede **recibir Secretaría de
   Coordinación en Ancocagua**. Cambia la ingesta (hoy solo SEC_DIR, sede LA_PAZ) y la máquina de estados
   (`do-not-touch.md`): necesita un ADR antes de implementarse.
3. **D-35:** hay que anotar quién mandó y cuándo, cuándo recibió Kardex y cuándo remitió. Ya lo cubren los pasos
   AVISAR_KARDEX, RECOGER y REMITIR, cada uno con su usuario y su fecha: no hace falta una bandeja de pases aparte.
4. **D-36:** "Bandeja de pases" y "Firma y entrega" **sí** van en el menú de Secretaría. Cambia DEC-044 #1; hoy esas
   pantallas siguen con datos del prototipo.
5. **D-42:** la entrega a un tercero solo puede ser a un familiar de **hasta primer grado de consanguinidad o
   afinidad**, previa verificación y con firma de recojo. Falta anotar el parentesco y el nombre en la entrega.
6. **D-44:** un trámite debe responderse en **48 a 72 horas**. El atraso de los reportes pasa de 10 días
   (DEC-039) a **72 horas sin moverse**.
7. **D-31** (TACFI por año) se aplica en DEC-051. Quedan incompletas y repreguntadas: D-10b → D-10c (formatos del
   historial), D-40 → D-40b (quién anota los datos del egresado: los 152 files son estudiantes activos, que
   tendrán cuenta) y D-41 → D-41b (fechas de capacitación; el acta se firma al final).

## DEC-051 — Requisitos del folder personal: 24 del catálogo, por gestión, TACFI con curso y semáforo con atrasados

**Fecha:** 2026-10-16 · **Fuente:** fotos del folder personal por WhatsApp (D-18b, D-30b), respuestas D-31 y D-39,
ADR-0007 (modo demo, sin SDD previo) · **Estado:** activa, implementada el 2026-10-16

1. **El catálogo son los 24 requisitos** de la hoja "Documentación existente en folder personal" de Kardex, en su
   orden (`requisito_tipo.orden`). Reemplaza los 6 provisionales: los TACFI y el certificado de notas conservan su
   código; los tres niveles del TCLO se dan de baja (lo registrado se conserva) y entran el boletín y el
   certificado legalizado TCLOA (provisional hasta D-46). El seed manda sobre el catálogo mientras Kardex no tenga
   cómo editarlo.
2. **Condicionales:** libreta militar solo varones (`solo_genero`); pueblo indígena solo modalidad B1, calificaciones
   de secundaria solo modalidad B (vale para B1, B3…; provisional hasta D-45) y carnet de discapacidad solo B3
   (`solo_modalidad`). Si el file no tiene el dato, no se pide. Los cuatro "si corresponde" no son obligatorios.
3. **Por gestión:** la matrícula y el certificado de notas (`por_gestion`) llevan una fila por gestión en
   `requisito_file` (`I/2025`, `II/2025` o `2023`; UNIQUE file + requisito + gestión). El certificado de notas ya
   registrado quedó en el año de su fecha. Qué gestiones se exigen espera D-47: por ahora basta con una.
4. **TACFI** (`pide_curso`): Artístico I en 1.º, Artístico II en 2.º, Tecnológico I en 3.º y Tecnológico II en 4.º
   (D-31). Completo exige la fecha en que lo tomó, el nombre del curso y la entidad emisora.
5. **El file** suma `genero`, `modalidad` (texto corto en mayúsculas, D-45) y `anio_formacion` (1–5), de la cabecera
   del folder personal. Los edita Kardex en "Datos personales".
6. **Semáforo (ADR-0007):** cuentan los obligatorios que aplican; un por gestión resume sus gestiones; un requisito
   de un año que el estudiante ya pasó y sin completar está **atrasado** y pone el file en **rojo** (D-31). La
   autorización de las autoridades se anota en la observación o como resolución académica (requisito 24).
7. **API:** `GET /files/:id/requisitos` devuelve por requisito `orden`, `porGestion`, `pideCurso`, `soloGenero`,
   `soloModalidad`, `aplica`, `atrasado`, `nombreCurso`, `entidadEmisora` y `gestiones`; `PUT …/:codigo` acepta
   `gestion`, `nombreCurso` y `entidadEmisora` (400 si faltan o sobran según el tipo). La bitácora guarda la gestión.
8. **Datos reales:** las fotos tienen datos de una estudiante; no van al repositorio ni a la hoja.

## DEC-052 — Respuestas D-28c a D-47; atraso a las 72 horas, entrega a familiares y bandejas de Secretaría

**Fecha:** 2026-10-16 · **Fuente:** hoja de la escuela (D-28c, D-40b, D-45 a D-47) y DEC-050 #4 a #6 (modo demo, sin
SDD previo) · **Estado:** activa, implementada el 2026-10-16

1. **D-28c, código de estudiante:** 209 (código de la UA Ancocagua) + iniciales + fecha de nacimiento (DDMMAA) + 00,
   por ejemplo `209-AUM05030000`. Sigue en texto libre y único; el formulario muestra el formato.
2. **D-45, modalidades:** A, B1, B2 y B3, y no es lo mismo una que otra. `file_academico.modalidad` solo acepta esas
   cuatro (CHECK) y es **obligatoria al registrar un estudiante** (no al editar ni para un egresado). Cambia ADR-0007:
   `solo_modalidad` es una lista exacta ("B1,B2,B3"); ya no vale "una letra para todas". El requisito 19 ("solo
   modalidad B") queda para B1, B2 y B3 como **no obligatorio** hasta D-45b.
3. **D-46, TCLOA:** se defiende, y no registrarlo es "un grave error del formulario manual". Vuelven las **3
   defensas** (básico en 1.º, intermedio en 2.º, avanzado en 3.º; D-04b) después del certificado TCLOA, con su año:
   una que falta de un año ya pasado está atrasada (D-31). El catálogo queda en 27 requisitos.
4. **D-47, gestiones:** se exigen todas. Hasta D-47b: la matrícula debe cubrir un año distinto por cada año cursado
   (incluido el actual) y el certificado de notas, uno por cada año terminado (`solo_anios_terminados`); dos
   semestres del mismo año son un año. Si falta alguno, el requisito queda PENDIENTE. Sin año de formación, basta uno.
5. **D-40b:** los datos del egresado los anota Kardex (como hoy).
6. **D-36:** "Bandeja de pases" (hacia Ancocagua y hacia Calahumana, con quién mandó, quién recibió y cuándo: D-35)
   y "Firma y entrega" (firmas de las Direcciones, llegada y entrega) vuelven al menú, **contra la API**: reusan la
   bandeja de Kardex. Ya no usan datos del prototipo.
7. **D-42:** la entrega es al titular o a un **familiar de hasta primer grado** (padre, madre, hijo/a, suegro/a,
   yerno/nuera), con su nombre y CI y la confirmación de que se verificó el parentesco y firmó el recojo; todo va en
   la observación del paso ENTREGAR.
8. **D-44:** un trámite en curso está **atrasado a las 72 horas** sin moverse (antes, 10 días; cambia DEC-039 #2).
   Los reportes devuelven las horas y los días.
9. **D-32** (SEC_COORD recibe en Ancocagua los certificados sin valorado) cambia la máquina de estados: espera D-32b
   (quién avisa y dónde se entrega) antes de su ADR.
10. Repreguntas en la hoja (filas 60–63): D-45b, D-47b, D-32b y D-41c.

## DEC-053 — El historial se contrasta con los empastes: se imprime en el valorado o se devuelve

**Fecha:** 2026-10-16 · **Fuente:** respuesta de la escuela por WhatsApp (D-48), modo demo, sin SDD previo ·
**Estado:** activa, implementada el 2026-10-16

1. **D-48:** el historial académico **ya existe**: lo genera el sistema del Ministerio. SISET no lo llena ni lo
   genera (refuerza D-39).
2. Antes de imprimir, Kardex **contrasta las notas del sistema con los empastes**:
   - **Sin observación:** imprime. "Marcar como impreso" muestra el N.º de valorado y el paso queda con
     "Impreso en el valorado N.º …" más la observación opcional.
   - **Con observación:** "Devolver con observación". La observación es obligatoria, no se imprime y el trámite queda
     en el estado final **Devuelto con observación**. El trámite que sigue ya no es del alcance de SISET.
3. Esto afina D-34 ("Kardex no revisa nada") solo para los trámites con valorado. Cambia la máquina de estados:
   ADR-0008, con la tabla de pruebas completa.
4. Reportes: los devueltos no están en curso ni atrasados y se cuentan aparte ("Devueltos con observación").
5. Se aplica al historial y a su legalización (el flujo con valorado). Se pregunta en D-48b si la legalización
   también se contrasta (hoja, fila 65).

## DEC-054 — Rol Administrador aparte: usuarios, roles y bitácora; Secretaría de Dirección sin files

**Fecha:** 2026-10-19 · **Fuente:** pedido del usuario tras consultarlo con la escuela (cambia la respuesta de
D-27 del 14-oct) · **Estado:** activa, implementada el 2026-10-19 · ADR-0009

1. **Rol `ADMIN` ("Administrador")**, separado de Kardex y sin trámites. Tiene `usuarios` (crear, leer, editar) y
   `auditoria` (leer): crea cuentas, asigna roles, da de baja, reactiva, restablece contraseñas, desbloquea y mira la
   bitácora. Su inicio es `/admin` (cuentas activas, bloqueadas y de baja). No ve files, requisitos ni hojas de ruta.
2. **Kardex pierde Usuarios y Bitácora.** También pierde la pestaña "Historial" del file, que sale de la bitácora:
   ese historial lo consulta el Administrador en la bitácora filtrada por el file. Restablecer contraseñas (D-14b)
   pasa al Administrador.
3. La regla "el sistema no se queda sin administrador" (DEC-020 #4) pasa del último Kardex activo al **último ADMIN
   activo** (`ULTIMO_ADMIN`); ya no protege a Kardex.
4. **SEC_DIR deja de ver files** (ni la lista, ni el detalle, ni las especialidades). Para registrar un trámite elige
   al egresado con `GET /hojas-ruta/titulares?texto=` (`hojas-ruta`/`crear`): hasta 8 egresados con nombre, CI,
   especialidad y bloqueo, sin semáforo ni requisitos. En el detalle del trámite ya no ve "Ver file".
5. Cuenta inicial: el seed crea el Administrador si vienen `SEED_ADMIN_CI` y `SEED_ADMIN_PASSWORD` (mismas reglas que
   el Kardex inicial). La migración `20261019120000` agrega el rol en las bases existentes. En la prueba, la cuenta
   es **9000005** (Prueba.2026), creada por `bd:datos-prueba` también en una base que ya tenía los datos.
6. Queda por saber quién será el Administrador en producción (nombre y CI): D-51 en la hoja.
   (2026-10-20) La persona que responde la hoja lo será hasta diciembre; faltan nombre, CI y sede, y si también es
   Kardex, confirmar dos cuentas (Kardex con su CI y Administrador con `<CI>-ADM`): D-51b, fila 71.

## DEC-055 — Kardex administra el catálogo de requisitos por modalidad

**Fecha:** 2026-10-19 · **Fuente:** pedido del usuario ("los requisitos cambian según la modalidad de ingreso") ·
**Estado:** activa, implementada el 2026-10-19

1. Pantalla de Kardex **"Requisitos por modalidad"** (`/requisitos`, permiso `requisitos`/`crear`): una fila por
   requisito y una columna por modalidad (A, B1, B2, B3). Marcar o desmarcar cambia a quién se le pide, con efecto
   inmediato en los requisitos y el semáforo de los files. Pestañas por modalidad con su conteo y "Dados de baja".
2. **Agregar:** nombre, descripción, modalidades, año de formación, género, obligatorio, si pide curso y entidad, y si
   es por gestión (con "solo años terminados"). El código sale del nombre y va al final del orden.
3. **Editar:** todo menos "por gestión" y "solo años terminados", que cambiarían cómo se leen los registros que ya
   hay. Un requisito tiene que pedirse al menos a una modalidad; todas marcadas se guarda como "todas" (`NULL`).
4. **Eliminar = dar de baja** (`activo = false`): deja de pedirse y de contar para el semáforo; lo registrado en los
   files se conserva y vuelve a verse al reactivarlo. Nunca se borra (las filas de `requisito_file` lo referencian).
5. Cada alta, edición, baja y reactivación deja su evento en la bitácora (módulo CATALOGOS, `requisito_tipo`).
6. **El seed ya no pisa el catálogo:** solo crea los requisitos que faltan. Un cambio que venga de la escuela va en
   una migración de datos (como D-45b en `20261019120000`). El motor del semáforo (ADR-0007) no cambia: sigue leyendo
   `solo_modalidad` del catálogo activo.

## DEC-056 — Respuestas de la hoja del 19-oct (D-45b, D-47b, D-32b, D-48b, D-49, D-50, D-41c)

**Fecha:** 2026-10-19 · **Fuente:** hoja de preguntas (la escuela escribió las respuestas en la columna Estado) ·
**Estado:** activa; #1 y #4 implementados el 2026-10-19

1. **D-45b:** el certificado de calificaciones de 1.º a 4.º de secundaria es **solo para B1**, y obligatorio (migración
   `20261019120000`; antes B1, B2 y B3 como "si corresponde").
2. **D-47b:** se confirma la regla de D-47 (una matrícula por año cursado, un certificado de notas por año terminado;
   si el año fue semestral, Kardex anota los dos semestres). Deja de ser provisional; el código no cambia.
3. **D-32b:** en Ancocagua, el egresado pide el certificado (sin valorado) a **Secretaría de Coordinación**, que lo
   deriva a Kardex; Kardex imprime y lo devuelve a Secretaría de Coordinación, que lo hace firmar con el Coordinador y
   lo **entrega en Ancocagua**. Es un tercer camino en la máquina de estados (ingesta por SEC_COORD y entrega sin
   pasar por Calahumana): queda como tarea con su ADR; hasta entonces solo SEC_DIR registra trámites.
4. **D-48b:** el contraste con los empastes es **solo del historial académico**, no de su legalización. `DEVOLVER`
   queda limitado al tipo `HISTORIAL_ACADEMICO` (ADR-0010).
5. **D-48** (nota de la escuela): el historial se imprime desde otro sistema; SISET solo muestra el seguimiento del
   trámite. Coincide con DEC-053.
6. **D-49:** al encontrar una incongruencia, Kardex **devuelve el historial a la secretaría que se lo remitió, con un
   informe técnico** de las observaciones. La observación obligatoria de `DEVOLVER` es ese informe. No respondió
   quién avisa al egresado ni qué pasa con el valorado: D-49b.
7. **D-50:** se confirma la propuesta: la autorización para un TACFI fuera de su año es **escrita** y dice hasta
   cuándo debe regularizar; se anota en la observación del requisito y el file sigue en rojo hasta completarlo.
8. **D-41c:** la capacitación será de **2 días, el 28 y 29 de octubre**; el horario todavía no lo saben: D-41d.
9. **D-10c:** dijo que sí enviará las fotos del historial y su legalización; sigue abierta hasta recibirlas.
10. Preguntas nuevas en la hoja: D-49b, D-41d y D-51 (filas 68–70).

## DEC-057 — Secretaría de Coordinación recibe y entrega los certificados en Ancocagua

**Fecha:** 2026-10-19 · **Fuente:** D-32b (hoja) y confirmación del usuario para implementarlo · **Estado:** activa,
implementada el 2026-10-19 · ADR-0011

1. En Ancocagua, **Secretaría de Coordinación registra** el pedido de un certificado de notas o de excelencia (sin
   valorado) en "Nueva hoja de ruta". El historial y su legalización siguen siendo solo de Calahumana.
2. Lo **deriva a Kardex**; Kardex lo recoge e imprime; el **Coordinador lo firma**; Secretaría de Coordinación lo
   **entrega** al titular o a un familiar de hasta primer grado (D-42), en Ancocagua.
3. Kardex no lo remite a Calahumana: su pestaña "Por remitir" solo muestra los recibidos en Calahumana.
4. Pantallas de SEC_COORD: inicio con "Por derivar a Kardex" y "Firmados, por entregar", menú "Nueva hoja de ruta" y
   "Firma y entrega" (por derivar, por firmar y por entregar), y avisos en la campana.
5. La demo trae un certificado de Ancocagua ya firmado y por entregar.

## DEC-058 — Kardex administra también las modalidades de ingreso

**Fecha:** 2026-10-19 · **Fuente:** pedido del usuario al revisar "Requisitos por modalidad" ("también se pueden crear
más modalidades") · **Estado:** activa, implementada el 2026-10-19

1. Las modalidades dejan de ser una lista fija (A, B1, B2, B3). Ahora son el catálogo **`modalidad_ingreso`**: código,
   nombre, descripción, orden y activo. Arranca con las cuatro de D-45, con nombre "Modalidad A"…; el nombre largo lo
   pone Kardex, porque la escuela no lo dio.
2. En "Requisitos por modalidad", la vista **Modalidades** sirve para agregar (código y nombre), editar (nombre,
   descripción y orden) y dar de baja o reactivar. El **código no se cambia**: lo guardan los files y los requisitos.
   Cada cambio queda en la bitácora (CATALOGOS, `modalidad_ingreso`).
3. Las columnas y las pestañas de la vista Requisitos, y la lista "Modalidad de ingreso" del file, salen de las
   modalidades **activas**.
4. **Dar de baja** no borra nada:
   - la modalidad deja de ofrecerse al registrar un file;
   - los files que la tienen la conservan, también al editarlos;
   - los requisitos que la nombran la guardan.
5. Integridad:
   - `file_academico.modalidad` pasa a tener una FK al código del catálogo (antes, un CHECK con la lista).
   - La lista de modalidades de cada requisito sigue siendo texto (`solo_modalidad`, "B1,B3"). La API la valida
     contra las activas (422 `MODALIDAD_INEXISTENTE`); un CHECK revisa el formato.
   - "Todas las activas" se guarda como "todas" (`NULL`), así que esos requisitos también se piden a las modalidades
     que se agreguen después.
6. El motor del semáforo (ADR-0007) no cambia: sigue comparando el código del file con la lista del requisito.

## DEC-059 — Historial devuelto: Secretaría avisa y el valorado vuelve con el trámite

**Fecha:** 2026-10-19 · **Fuente:** D-49b (hoja, fila 68) · **Estado:** activa

1. Cuando Kardex devuelve el historial con observación (DEC-053), el **valorado sin usar vuelve a la secretaría** que
   remitió el trámite, junto con el informe técnico. Secretaría de Dirección General avisa al egresado.
2. Se confirma la propuesta de D-49b: el valorado se maneja como hoy, fuera del sistema. El trámite sigue terminando en
   DEVUELTO y el código no cambia; solo el manual de Kardex lo explica.

## DEC-060 — Los egresados no tienen requisitos

**Fecha:** 2026-10-19 · **Fuente:** pedido del usuario ("los egresados no necesitan los requisitos, ya se titularon y
presentaron todo antes") · **Estado:** activa, implementada el 2026-10-19

1. El file con condición **EGRESADO** no tiene requisitos: `GET /files/:id/requisitos` devuelve una lista vacía y
   `PUT /files/:id/requisitos/:codigo` responde 422 `FILE_EGRESADO`.
2. Su **semáforo es `null`** ("sin requisitos"): no sale en el filtro por color ni en los avisos de files en rojo.
3. En la web, su file no muestra la pestaña Requisitos y la lista de files dice "Sin requisitos (egresado)".
4. Lo que se registró mientras era estudiante no se borra; vuelve a verse si el file vuelve a ESTUDIANTE.
5. El motor del semáforo (ADR-0007) no cambia: la regla se aplica antes, en el servicio.

## DEC-061 — Estilo visual: hoja blanca en un marco, IBM Plex y color solo en los datos

**Fecha:** 2026-10-19 · **Fuente:** pedido del usuario ("mejora la interfaz gráfica") con el skill de diseño
(tasteskill, estilo de app _framed-sheet_) · **Estado:** activa, implementada el 2026-10-19

1. **Marco y hoja.** El menú y la barra superior forman un marco en L sobre un gris azulado tomado del azul de la ESFM
   (`--color-marco`); cada pantalla va en una hoja blanca con borde fino y sin sombra. Se va el menú azul oscuro.
2. **Color.** El azul institucional (`--color-primario`) queda para la marca, la acción principal, la pestaña activa y
   el dato principal (menos del 3 % de la pantalla). Los estados de la hoja de ruta usan un solo tono: gris pálido
   mientras avanza, azul pálido en "Listo para entregar", verde al entregar y rojo al devolver. El rojo de un
   indicador sale solo cuando pide atención y no es cero.
3. **Tipografía.** IBM Plex Sans para todo e IBM Plex Mono solo para identificadores (N.º de hoja de ruta, CI,
   códigos), servidas desde la propia web (OFL-1.1, sin CDN). Reemplaza a Inter.
4. **Indicadores sin íconos.** Etiqueta y cifra en un solo panel dividido por líneas (`GrillaKpi`), sin ícono en un
   cuadro de color.
5. **El camino del trámite** (`CaminoTramites`): en el inicio de cada secretaría y de Kardex, los pasos del flujo con
   su cantidad, unidos por una línea, como la marca de SISET (dos puntos unidos: Calahumana y Ancocagua). Debajo del
   saludo, una frase dice lo pendiente, calculada de los datos.
6. **Tablas.** Encabezados en minúscula y gris, sin banda; fechas y cifras a la derecha con dígitos tabulares; dentro
   de una tarjeta, la tabla no dibuja un segundo marco.
7. Solo en desarrollo, `?como=<id>` abre la demo con esa cuenta para revisar pantallas sin pasar por el login (no
   llega al build de producción).
8. **Corrección del usuario (mismo día):** no le gustaron los colores del marco gris ni la marca dibujada. Vuelven el
   **menú azul** (primario `#1F4E79`, ítem activo en blanco), la barra superior blanca y el **logo de texto "SISET"**.
   La paleta queda en **dos colores**: primario `#1F4E79` (menú, acción principal) y **secundario celeste `#2E75B6`**
   (pestaña activa, enlaces, el punto del camino del trámite, el dato principal de los gráficos y los estados en curso,
   en celeste pálido). Verde, ámbar y rojo, solo para estados. Se quedan la tipografía, los indicadores sin íconos, el
   camino del trámite y las tablas.
9. Revisadas también: bitácora (texto a 13–14px, aviso con un solo ícono), carga masiva (los pasos sin números y la
   tarjeta "Columnas de la plantilla" junto al área para soltar el archivo) y guías.

## DEC-062 — Hoja del folder personal con Sí/No, imprimible

**Fecha:** 2026-10-19 · **Fuente:** pedido del usuario con la foto de la hoja «Documentación existente en folder
personal» (formato de Archivo Kardex) · **Estado:** activa, implementada el 2026-10-19

1. En _Mi file académico_, el estudiante ve primero la **hoja del folder**: una fila por requisito del catálogo, en su
   orden, con la marca en **Sí** (completo) o **No** (obligatorio para su file y le falta). Sin marca: lo que no le
   corresponde (género o modalidad) y los «si corresponde» que no presentó. Los por gestión listan sus gestiones
   completas («Matrícula I/2024, II/2024»). Como en papel, el nombre lleva «(varones)», «(solo mod. B1)» o «(si
   corresponde)».
2. La marca la da lo que **Kardex registró**: el estudiante no la cambia (solo Kardex registra requisitos, DEC-015).
3. **Imprimir hoja del folder** la imprime en el formato de papel, tamaño carta, en una página: encabezado de la ESFM,
   título con la gestión actual, apellidos y nombres, CI, código, género, especialidad, año de formación en palabras y
   modalidad; la tabla NRO / REQUISITOS / SI / NO y las firmas «Estudiante» y «Unidad de Sistemas y Archivo Kardex».
   El mismo botón está en la pestaña _Requisitos_ del file, para Kardex.
4. Los escudos de la hoja de papel no van todavía: hacen falta los archivos de imagen oficiales (no se toman de la foto).
