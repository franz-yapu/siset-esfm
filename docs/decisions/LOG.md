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
