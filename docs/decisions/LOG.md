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
