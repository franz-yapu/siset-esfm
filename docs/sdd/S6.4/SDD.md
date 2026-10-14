# SDD — S6.4 · Bitácora inmutable (rol de BD de la app) y consulta `GET /auditoria`

- **Ticket:** ClickUp **S6.4** (`868mh1kx2`, https://app.clickup.com/t/868mh1kx2).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Depende de:** S1.6 (`autorizar('auditoria', 'leer')`). La parte de la base (§2.1) no depende de nada y puede ir antes.
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` RF-14 (CA1 qué se registra, CA2 sin UPDATE ni DELETE desde la app, CA3 Kardex filtra por fecha, usuario y módulo)
  2. `docs/decisions/LOG.md` — DEC-007 #4 (`GET /auditoria` solo KARDEX, filtros por usuario, módulo, acción, fecha y **entidad**), DEC-008 #2 (rol de BD separado en S6.4)
  3. `docs/adr/0003-*.md` §Decisión #2 (dos barreras: trigger + permisos; la app se conecta con un rol distinto del dueño)
  4. `docs/do-not-touch.md` (bitácora), `docs/adr/0002-autorizacion-casbin.md`, `docs/sdd/S1.6/SDD.md` (política: `KARDEX, auditoria, leer`)
  5. `docs/sdd/S0.4/SDD.md`, `docs/sdd/S0.9/SDD.md` (Compose, servicio `migrar`, `.env` de staging)
  6. `apps/web/src/services/bitacora.service.ts`, `apps/web/src/types/index.ts` (`RegistroBitacora`, `FiltrosBitacora` del prototipo, P-48)

---

## 1 · Alcance

### Entra

- **Rol de base de datos `siset_app`** con el que se conecta la API: puede leer y escribir las tablas de negocio, pero en `log_auditoria` solo `SELECT` e `INSERT`. El dueño de las tablas (`siset`) sigue corriendo las migraciones y el seed.
- **`GET /api/v1/auditoria`** (solo KARDEX): filtros por usuario, módulo, acción, rango de fechas y entidad (+ id), paginado del lado del servidor.
- Índice nuevo `(entidad, entidad_id, fecha DESC)` para "historial de un registro".
- Revisión de cobertura: qué escrituras existen hoy y qué evento registra cada una (§2.4).

### No entra (a propósito)

- La pantalla P-48 conectada → S6.5.
- Exportar la bitácora → S6.3.
- Purgar eventos viejos → nunca desde la app (ADR-0003).

### Premisas verificadas (heredadas de `task-brief`)

| Premisa del ticket                        | Qué hay de verdad en el repo                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Los triggers ya existen desde S0.11"     | ✅ `fn_solo_insercion()` con `BEFORE UPDATE OR DELETE` y `BEFORE TRUNCATE`; `esquema.test.ts` lo prueba.                                                                                                                                                          |
| Hay un rol de app distinto del dueño      | ❌ Compose, la CI y `.env.example` usan **`siset`** (el superusuario que crea la imagen de Postgres) para todo: migraciones, seed y API. Este ticket crea `siset_app` y cambia la conexión de la API.                                                             |
| `GET /auditoria` con filtros y paginación | ⚠️ No hay convención de paginación en la API todavía: este SDD la define (§2.2) y la reutilizan S1.8 y S2.2.                                                                                                                                                      |
| Filtrar por entidad (DEC-007 #4)          | ⚠️ Hay índices por fecha, por usuario y por módulo, pero **no por entidad**. Se agrega uno (§2.1). Es solo un índice: no cambia la tabla ni la inmutabilidad.                                                                                                     |
| Mostrar el nombre del usuario             | ⚠️ `log_auditoria` solo guarda `usuario_id`. El CI está en `usuario` (módulo `seguridad`) y el nombre en `persona` (`personas`). `auditoria` no puede leer esas tablas (ADR-0001): la raíz de composición le inyecta una función (§2.3), como `nombreDe` en S1.3. |
| `autorizar` existe                        | ❌ Llega con S1.6. Este ticket se implementa después.                                                                                                                                                                                                             |

---

## 2 · Diseño técnico

### Módulos del monolito (ADR-0001)

| Módulo      | Rol en este ticket | API pública (`index.ts`)                                                                   | Tablas propias que toca             |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| `auditoria` | dueño              | **agrega** `crearModuloAuditoria`                                                          | `log_auditoria` (lee; índice nuevo) |
| `seguridad` | consumido          | **agrega** `describirUsuarios(ids)` (CI y `personaId`)                                     | `usuario` (lee)                     |
| `personas`  | consumido          | `buscarNombreCompleto` (S1.3); se agrega la versión por lote `buscarNombresCompletos(ids)` | `persona` (lee)                     |

### 2.1 Rol `siset_app` (migración `rol_app`)

```sql
-- ADR-0003 §2 + DEC-008 #2. Los roles son de todo el servidor: se crea solo si no existe.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'siset_app') THEN
    CREATE ROLE siset_app NOLOGIN;      -- la contraseña y LOGIN los pone el despliegue, nunca el repo
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO siset_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO siset_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siset_app;
REVOKE UPDATE, DELETE, TRUNCATE ON log_auditoria FROM siset_app;     -- segunda barrera
REVOKE ALL ON _prisma_migrations FROM siset_app;                     -- la app no toca migraciones

-- Tablas y secuencias que creen las migraciones futuras (las crea el dueño):
DO $$ BEGIN
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO siset_app', current_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public
                  GRANT USAGE, SELECT ON SEQUENCES TO siset_app', current_user);
END $$;
```

- **`movimiento_hoja_ruta`** (S3.x), también de solo inserción, repetirá el `REVOKE` en su propia migración. Queda escrito como regla en el comentario de la migración.
- **Contraseña y `LOGIN`:** un script nuevo, `apps/api/prisma/configurar-rol-app.ts` (`npm run bd:rol-app`), hace `ALTER ROLE siset_app LOGIN PASSWORD …` con `APP_DB_PASSWORD`. Es idempotente y nunca imprime la contraseña. El servicio `migrar` de Compose lo corre después de `migrate deploy`.
- **Compose:** `api.DATABASE_URL` pasa a `postgresql://siset_app:${APP_DB_PASSWORD:?…}@db:5432/siset`. `migrar` sigue con `siset`.
- **Staging** (`desplegar-staging.sh`): genera `APP_DB_PASSWORD` la primera vez, igual que `JWT_SECRET`.
- **Desarrollo local:** `apps/api/.env` puede seguir con `siset` (comodidad); `.env.example` documenta las dos opciones. Los tests de BD usan el dueño para preparar los datos y `SET ROLE siset_app` para probar los permisos, sin contraseña. Así no pisan la contraseña del rol en el servidor local.

### 2.2 `GET /api/v1/auditoria`

`autenticar` → `autorizar('auditoria', 'leer')` → `validar({ query })`.

| Parámetro              | Tipo                      | Nota                                                    |
| ---------------------- | ------------------------- | ------------------------------------------------------- |
| `usuarioId`            | entero                    |                                                         |
| `modulo`               | uno de `ModuloAuditoria`  | lista cerrada de S0.7                                   |
| `accion`               | una de `AccionAuditoria`  | lista cerrada                                           |
| `desde`, `hasta`       | fecha `AAAA-MM-DD`        | inclusivas, en hora de La Paz (la base ya usa esa zona) |
| `entidad`, `entidadId` | texto                     | `entidadId` exige `entidad`                             |
| `pagina`               | entero ≥ 1, por defecto 1 |                                                         |
| `porPagina`            | 1–100, por defecto 50     |                                                         |

Respuesta (**convención de paginación de la API**, la reutilizan S1.8 y S2.2):

```jsonc
{
  "datos": [
    {
      "id": 812,
      "fecha": "2026-10-20T14:03:11.000Z",
      "usuario": { "id": 3, "usuario": "1234567", "nombre": "Ana Mamani" }, // null si el evento no tiene usuario
      "accion": "LOGIN_FALLIDO",
      "modulo": "SEGURIDAD",
      "entidad": "usuario",
      "entidadId": "3",
      "antes": null,
      "despues": { "motivo": "PASSWORD_INCORRECTA", "intentosFallidos": 2 },
      "ip": "198.51.100.4",
      "userAgent": "Mozilla/5.0 …",
    },
  ],
  "pagina": 1,
  "porPagina": 50,
  "total": 1342,
}
```

- Orden: `fecha DESC, id DESC` (estable aunque dos eventos tengan la misma fecha).
- Paginación por offset (`skip`/`take`) más un `count` con los mismos filtros. Los índices por fecha, usuario, módulo y entidad cubren los filtros de P-48.
- **Consultar la bitácora no se registra en la bitácora:** sería un evento por cada página que mira Kardex, sin valor de auditoría. Si la escuela lo pide, se agrega una acción con un PR.
- `desde > hasta` → 400 `VALIDACION`.

### 2.3 Nombre del usuario sin cruzar módulos

`crearModuloAuditoria({ bd, autenticar, autorizar, describirUsuarios })`. `app.ts` arma `describirUsuarios(ids)` combinando `seguridad.describirUsuarios` (CI y `personaId`) y `personas.buscarNombresCompletos`. Es una consulta por lote por página (sin N+1).

### 2.4 Revisión de cobertura (DEC-007)

| Escritura de negocio o evento de acceso que existe hoy | Evento                                       | Dónde       |
| ------------------------------------------------------ | -------------------------------------------- | ----------- |
| Login correcto / fallido / bloqueo                     | `LOGIN` / `LOGIN_FALLIDO` / `BLOQUEO_CUENTA` | S1.3, S1.4  |
| Refresh rotado                                         | — (DEC-010 #2)                               | S1.5        |
| Reuso de refresh                                       | `REUSO_SESION`                               | S1.5        |
| Logout                                                 | `LOGOUT`                                     | S1.5        |
| Cambio de contraseña                                   | `CAMBIAR_PASSWORD`                           | S1.5        |
| Seed (catálogos, Kardex inicial, requisitos)           | — (lo corre el despliegue, no un usuario)    | S0.11, S2.1 |

S1.8 (usuarios) y S2.2 (files) traen sus propias escrituras; cada SDD lista su evento. Este cuadro queda en el SDD como foto de hoy, sin un test automático: el control es por revisión, ticket a ticket.

---

## 3 · Cambios por archivo/módulo

| Archivo/módulo                                                                                                                                                  | Cambio                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/migrations/<fecha>_rol_app/migration.sql`                                                                                                      | **Nuevo** (§2.1) + índice de entidad.                                                                |
| `apps/api/prisma/schema/auditoria.prisma`                                                                                                                       | + `@@index([entidad, entidadId, fecha(sort: Desc)])`.                                                |
| `apps/api/prisma/configurar-rol-app.ts`, `apps/api/package.json`                                                                                                | **Nuevo** script `bd:rol-app`.                                                                       |
| `docker-compose.yml`                                                                                                                                            | `migrar`: `bd:desplegar && bd:rol-app` con `APP_DB_PASSWORD`; `api`: `DATABASE_URL` con `siset_app`. |
| `.env.example` (raíz), `apps/api/.env.example`                                                                                                                  | + `APP_DB_PASSWORD`.                                                                                 |
| `.github/workflows/ci.yml`                                                                                                                                      | + `APP_DB_PASSWORD` en el job `docker`.                                                              |
| `scripts/desplegar-staging.sh`                                                                                                                                  | Genera `APP_DB_PASSWORD` si falta.                                                                   |
| `apps/api/src/modulos/auditoria/{auditoria.rutas,auditoria.controlador,auditoria.esquemas}.ts`, `auditoria.repositorio.ts`, `auditoria.servicio.ts`, `index.ts` | Consulta paginada y módulo HTTP.                                                                     |
| `apps/api/src/modulos/seguridad/usuario.repositorio.ts`, `index.ts`                                                                                             | + `describirUsuarios`.                                                                               |
| `apps/api/src/modulos/personas/persona.repositorio.ts`, `index.ts`                                                                                              | + `buscarNombresCompletos`.                                                                          |
| `apps/api/src/compartido/http/paginacion.ts`                                                                                                                    | **Nuevo**: esquema Zod de `pagina`/`porPagina` y el tipo `Pagina<T>` (convención de §2.2).           |
| `apps/api/src/app.ts`                                                                                                                                           | Monta el módulo de auditoría.                                                                        |
| `apps/api/test/bd/rol-app.test.ts`, `auditoria-consulta.test.ts`                                                                                                | **Nuevos** (§4).                                                                                     |
| `docs/decisions/LOG.md`                                                                                                                                         | DEC-017 (§7).                                                                                        |

---

## 4 · Plan de tests

| Caso                                                                                                                                                            | Nivel          | Cubre                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------- |
| Con `SET ROLE siset_app`: `INSERT` y `SELECT` en `log_auditoria` funcionan; `UPDATE`, `DELETE` y `TRUNCATE` fallan con **permiso denegado** (antes del trigger) | BD             | DoD, ADR-0003 §2        |
| Con `siset_app`: puede insertar y actualizar en `usuario` y `refresh_token`; no puede leer `_prisma_migrations`                                                 | BD             | §2.1                    |
| Una tabla creada después de la migración (en el test, por el dueño) queda con permisos para `siset_app`                                                         | BD             | Privilegios por defecto |
| La migración es idempotente con el rol ya existente (la corre dos veces la CI en bases distintas del mismo servidor)                                            | BD             | `IF NOT EXISTS`         |
| `GET /auditoria` como KARDEX: 200 con `datos`, `pagina`, `porPagina`, `total`, en orden `fecha DESC, id DESC`, con el nombre del usuario                        | BD + Supertest | §2.2                    |
| Cada filtro solo y combinados: `usuarioId`, `modulo`, `accion`, `desde`/`hasta` (bordes inclusivos en hora de La Paz), `entidad` + `entidadId`                  | BD + Supertest | DoD "test de filtros"   |
| Paginación: `porPagina=2` en 5 eventos → 3 páginas; la página 4 viene vacía con el `total` correcto                                                             | BD + Supertest | §2.2                    |
| Evento sin usuario → `usuario: null`                                                                                                                            | BD + Supertest | ADR-0003 #3             |
| `porPagina=101`, `modulo` inexistente, `desde > hasta` o `entidadId` sin `entidad` → 400                                                                        | Supertest      | §2.2                    |
| SEC_DIR → 403; sin token → 401; KARDEX con `cpw` → 403 `CAMBIO_PASSWORD_REQUERIDO`                                                                              | BD + Supertest | S1.6                    |
| `bd:rol-app` sin `APP_DB_PASSWORD` falla con un mensaje claro y sin mostrar valores                                                                             | Unit           | §2.1                    |
| La prueba de humo de Docker sigue en verde con la API conectada como `siset_app`                                                                                | CI (`docker`)  | §2.1                    |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S6.4/SDD.md`, Estado = Aprobado.
- [ ] Test: la app (`siset_app`) no puede modificar ni borrar la bitácora.
- [ ] Test de filtros y paginación.
- [ ] API conectada como `siset_app` en Compose y staging.
- [ ] DEC-017 en `LOG.md`.
- [ ] Quality gate en verde (incluido `docker`).
- [ ] Commit `S6.4 …` en la rama `feat/S6.4-bitacora-inmutable`.

---

## 6 · Riesgos

| Riesgo                                                                                           | Gravedad                                     | Mitigación                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una migración futura crea una tabla de solo inserción y se olvida del `REVOKE`                   | Media                                        | El comentario de la migración `rol_app` lo pide, y el SDD de S3.x (`movimiento_hoja_ruta`) lo lista en su DoD.                                                                         |
| El usuario que corre las migraciones en algún entorno no puede crear roles                       | Baja                                         | En Compose, la CI y staging es el superusuario de la imagen. Si un servidor institucional (D-12) no lo permite, el DBA crea el rol una vez y la migración lo saltea (`IF NOT EXISTS`). |
| Cambiar la conexión de la API rompe el stack de Docker local de quien no tenga `APP_DB_PASSWORD` | Media                                        | Compose falla con un mensaje claro (`:?`), y `.env.example` lo trae con un valor de desarrollo.                                                                                        |
| Paginar por offset es lento con muchos eventos y páginas muy profundas                           | Baja (el piloto genera unos cientos por día) | Los filtros por fecha acotan la búsqueda. Si hiciera falta, se pasa a cursor (`fecha`, `id`) sin cambiar el contrato de filtros.                                                       |

---

## 7 · Preguntas abiertas

- **Para la escuela:** ninguna.
- **DEC-017 (va a `LOG.md`):**
  1. La API se conecta como `siset_app`: sin `UPDATE`, `DELETE` ni `TRUNCATE` en `log_auditoria` ni acceso a `_prisma_migrations`. La contraseña la pone el despliegue (`bd:rol-app`).
  2. Convención de paginación de la API: `pagina`/`porPagina` (máx. 100) → `{ datos, pagina, porPagina, total }`.
  3. Consultar la bitácora no genera eventos.
  4. Índice `(entidad, entidad_id, fecha DESC)` para el historial de un registro.
