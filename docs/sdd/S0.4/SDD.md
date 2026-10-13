# SDD — S0.4 · Docker Compose completo: base de datos, API, web y Nginx

- **Ticket:** ClickUp **S0.4** (`868mgh284`, https://app.clickup.com/t/868mgh284).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-13)
- **Versión:** 1.1 · **Fecha:** 2026-10-13 (ver changelog al pie)
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §5 (Infraestructura: Docker Compose, Nginx como proxy con TLS), RNF-10 (HTTPS, Helmet, CORS), RNF-12
  2. `docs/decisions/LOG.md` — DEC-004 (Node 26, última estable), DEC-005 (PostgreSQL 18, servicio `db` ya creado en S0.6)
  3. `docs/sdd/S0.7/SDD.md` §2.2 (config de la API: `TRUST_PROXY`, `CORS_ORIGEN`), `docs/sdd/S0.8/SDD.md` §2.1 (la web llama a `/api/v1` en el mismo origen)
  4. `docs/adr/0003-bitacora-inmutable.md` (separar el rol dueño del rol de la app: "se define en S0.4/S0.9")
  5. `docs/planning/2026-10-12-tickets/S0.4-docker-compose.json`

---

## 1 · Alcance

### Entra

- **Imagen de la API** (`apps/api/Dockerfile`, multi-stage): build con tsdown y runtime solo con dependencias de producción, usuario no root y filesystem de solo lectura.
- **Imagen de la web** (`apps/web/Dockerfile`): build de Vite y **Nginx 1.30** que sirve la SPA **y** hace de proxy de `/api` hacia la API.
- **`docker-compose.yml`**:
  - `db` (ya existe), `migrar` (aplica las migraciones y termina), `api` y `web`.
  - El perfil **`completo`** levanta todo; sin perfil, solo `db`, que es el flujo de desarrollo actual.
- Configuración de Nginx: fallback de la SPA, caché de assets, gzip, cabeceras de seguridad y `X-Forwarded-*` para que la bitácora registre la IP real.
- `.dockerignore`; `.env.example` de la raíz con las variables de compose.
- **Prueba de humo** (`scripts/docker-smoke.sh`) y la **suite E2E corriendo contra el stack de Docker**, también en la CI (job `docker`).

### No entra (a propósito)

- **TLS / Let's Encrypt** → S0.9 (staging), porque necesita un dominio y un servidor (D-12). Localmente es HTTP en `127.0.0.1`.
- **Rol de BD separado para la app** (dueño de las tablas frente a la app sin `UPDATE/DELETE/TRUNCATE` en la bitácora): lo usa el `REVOKE` de S6.4. Se difiere a S6.4 junto con ese `REVOKE`, porque crear el rol sin usarlo no protege nada. ADR-0003 decía "S0.4/S0.9": se elige S6.4 y queda anotado en la DEC del ticket (§7).
- **`JWT_SECRET`**: lo pedía el ticket, pero ningún código lo usa todavía. Se agrega en S1.x, que es donde se lee y se valida.
- Publicar las imágenes en un registro → S0.9.

### Premisas verificadas (`task-brief`)

| Premisa del ticket                                                                 | Qué hay de verdad                                                                                                                                                    |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db` con `postgres:16`                                                             | ⚠️ Ya existe desde S0.6, con `postgres:18-alpine` (DEC-005), volumen nombrado, healthcheck y zona horaria. Se mantiene.                                              |
| `web` (build servido por Nginx) + `nginx` como proxy, en contenedores separados    | ⚠️ Serían dos Nginx. Se usa **uno solo** (`web`) que sirve la SPA y hace de proxy de `/api` (§2.3). Hay un contenedor menos y el mismo origen para la cookie (S0.8). |
| `.env.example` con `DATABASE_URL`, `JWT_SECRET`, `VITE_API_URL`, `VITE_PUBLIC_URL` | ⚠️ `DATABASE_URL` se arma dentro de compose. `JWT_SECRET` → S1.x. `VITE_API_URL` queda vacío (mismo origen). Se agregan `WEB_PORT` y `VITE_USAR_API`.                |
| Perfil de desarrollo con solo `db`                                                 | ✅ Es el comportamiento por defecto (`docker compose up -d db`), y no cambia.                                                                                        |
| Versiones                                                                          | ✅ `node:26.11.1-alpine3.24` y `nginx:1.30-alpine` (1.30.5 es la estable; 1.31 es mainline), verificadas el 2026-10-13.                                              |

---

## 2 · Diseño técnico

### 2.1 Servicios

```
                         127.0.0.1:${WEB_PORT:-8080}
                                    │
                        ┌───────────▼───────────┐
                        │ web (nginx 1.30)      │  /        → SPA (dist de Vite)
                        │                       │  /api/*   → proxy http://api:3000
                        └───────────┬───────────┘
                                    │ red interna
   migrar (una vez) ──► db ◄── api (node 26, no root, solo lectura, puerto no expuesto)
                        │
          127.0.0.1:${DB_PORT:-5432} (solo para desarrollo local)
```

| Servicio | Perfil     | Imagen                    | Depende de                      | Healthcheck                                 |
| -------- | ---------- | ------------------------- | ------------------------------- | ------------------------------------------- |
| `db`     | (siempre)  | `postgres:18-alpine`      | —                               | `pg_isready` (existente)                    |
| `migrar` | `completo` | stage `build` de la API   | `db` healthy                    | — (termina con `prisma migrate deploy`)     |
| `api`    | `completo` | stage `runtime` de la API | `migrar` completed_successfully | `GET /api/v1/health` con `node -e fetch(…)` |
| `web`    | `completo` | imagen de la web          | `api` healthy                   | `wget -qO- http://127.0.0.1/`               |

Variables de la API dentro de compose:

- `NODE_ENV=production`
- `DATABASE_URL=postgresql://siset:${POSTGRES_PASSWORD}@db:5432/siset`
- `CORS_ORIGEN=${WEB_ORIGEN:-http://localhost:8080}`
- `TRUST_PROXY=1`: la API está detrás de Nginx y así la bitácora guarda la IP real.
- `LOG_LEVEL=info`

### 2.2 Imagen de la API (`apps/api/Dockerfile`, contexto: raíz del repo)

```
FROM node:26.11.1-alpine3.24 AS build
  WORKDIR /app
  COPY package.json package-lock.json .npmrc ./  +  apps/api/package.json apps/web/package.json (para que npm ci resuelva los workspaces)
  RUN npm ci -w @siset/api --include-workspace-root   (devDeps incluidas: prisma, tsdown)
  COPY tsconfig.base.json + apps/api/
  RUN npx -w @siset/api prisma generate && npm run build -w @siset/api
  # Este stage también lo usa el servicio `migrar` (tiene el CLI de Prisma y las migraciones).

FROM node:26.11.1-alpine3.24 AS runtime
  ENV NODE_ENV=production
  WORKDIR /app
  COPY package.json package-lock.json .npmrc + apps/*/package.json
  RUN npm ci -w @siset/api --omit=dev --ignore-scripts && npm cache clean --force
  COPY --from=build /app/apps/api/dist apps/api/dist  y  apps/api/package.json
  USER node
  CMD ["node", "apps/api/dist/servidor.mjs"]
```

- **Por qué `--ignore-scripts` en runtime:** el `postinstall` (`prisma generate`) necesita el CLI de Prisma, que es devDependency. El cliente generado ya está **dentro del bundle** de tsdown, porque es código local de `src/compartido/bd/generado`. Solo hace falta su runtime (`@prisma/client`), que sí es dependencia de producción.
- **Por qué `migrar` aparte:** las migraciones necesitan el CLI de Prisma y no deben correr dentro del proceso de la API. Así la imagen de runtime no lleva el CLI, y si una migración falla, la API no arranca.
- En compose, la API corre con `read_only: true`, `tmpfs: /tmp`, `cap_drop: [ALL]` y `security_opt: [no-new-privileges:true]`.

### 2.3 Imagen de la web (`apps/web/Dockerfile`)

```
FROM node:26.11.1-alpine3.24 AS build
  ARG VITE_USAR_API=false  VITE_DEMO=true  VITE_PUBLIC_URL=  VITE_API_URL=
  npm ci -w @siset/web --include-workspace-root  +  vite build
FROM nginx:1.30-alpine
  COPY apps/web/nginx/siset.conf → /etc/nginx/conf.d/default.conf
  COPY --from=build apps/web/dist → /usr/share/nginx/html
```

`apps/web/nginx/siset.conf`:

- `server_tokens off`, `gzip on` (js, css, json, svg), `client_max_body_size 1m`.
- `location /api/`: `proxy_pass http://api:3000`, con `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` y `X-Request-Id`. Timeouts: 30 s de lectura.
- `location /assets/`: `Cache-Control: public, max-age=31536000, immutable` (los nombres llevan hash).
- `location /`: `try_files $uri /index.html` (fallback de la SPA) y `Cache-Control: no-cache` para `index.html`.
- Cabeceras de seguridad para la SPA (las de la API ya las pone Helmet):
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`

  **Riesgo de la CSP:** que bloquee algo de la SPA (estilos inline de Tailwind o librerías). Se valida con la suite E2E completa contra el stack (§4): cualquier violación de CSP aparece como error de consola y el recorrido falla.

### 2.4 Compose y variables

- Perfil `completo`: `docker compose --profile completo up -d --build`.
- `.env.example` (raíz):
  - `DB_PORT=5432`
  - `POSTGRES_PASSWORD=siset_dev`
  - `WEB_PORT=8080`
  - `WEB_ORIGEN=http://localhost:8080`
  - `VITE_USAR_API=false`, con un comentario: build arg de la web; `true` cuando existan los endpoints.
- Seed manual en el stack completo: `docker compose --profile completo run --rm -e SEED_KARDEX_CI=… -e SEED_KARDEX_PASSWORD=… migrar npm run bd:seed -w @siset/api`. Se documenta en el README; la contraseña nunca va en el repo.
- `.dockerignore` (raíz): `**/node_modules`, `**/dist`, `**/dist-e2e-*`, `.git`, `**/.env`, `**/test-results`, `**/playwright-report`, `docs`, `**/generado`.

### 2.5 Prueba de humo y CI

`scripts/docker-smoke.sh` (bash, sin dependencias):

1. `docker compose --profile completo up -d --build --wait`.
2. Verifica:
   - `GET /` → 200 con `<div id="root">`.
   - `GET /files/123` (ruta de la SPA) → 200 (fallback).
   - `GET /api/v1/health` → 200 `{"estado":"ok","bd":"ok"}`.
   - `GET /api/v1/no-existe` → 404 con `"code":"NO_ENCONTRADO"`.
   - Las cabeceras de seguridad y la CSP están presentes; `Server` no muestra la versión.
   - La API corre como usuario `node`, no root (`docker compose exec api id -u` ≠ 0).
   - `migrar` terminó con código 0.
3. Al salir, siempre: `docker compose --profile completo down -v` (también si falla), **solo con el nombre de proyecto de la prueba** (`-p siset-smoke`), para no tocar la base de desarrollo.

La suite E2E acepta `E2E_BASE_URL`: si está definida, no levanta sus propios servidores y corre el proyecto
`mock` contra esa URL. La CI agrega el job **`docker`**: humo + E2E contra `http://localhost:8080`.

---

## 3 · Cambios por archivo/módulo

| Archivo                                            | Cambio                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/api/Dockerfile`                              | **Nuevo** (§2.2).                                                                       |
| `apps/web/Dockerfile`, `apps/web/nginx/siset.conf` | **Nuevos** (§2.3).                                                                      |
| `docker-compose.yml`                               | Servicios `migrar`, `api` y `web` con perfil `completo` (§2.1, §2.4). `db` sin cambios. |
| `.dockerignore`                                    | **Nuevo**.                                                                              |
| `.env.example` (raíz)                              | Variables de §2.4.                                                                      |
| `scripts/docker-smoke.sh`                          | **Nuevo** (§2.5).                                                                       |
| `apps/web/playwright.config.ts`                    | Soporte de `E2E_BASE_URL`.                                                              |
| `.github/workflows/ci.yml`                         | Job `docker`.                                                                           |
| `README.md`                                        | Sección "Stack completo con Docker".                                                    |
| `docs/decisions/LOG.md`                            | DEC-008: el rol de BD separado se difiere a S6.4; `web` y Nginx en un solo contenedor.  |

Commits en `feat/S0.4-docker-compose`: `S0.4 SDD`, `S0.4 imágenes de API y web con Nginx`, `S0.4 compose con perfil completo, migraciones y seguridad`, `S0.4 prueba de humo, E2E contra Docker y job de CI`.

---

## 4 · Plan de tests

| Caso                                                                                                                  | Cómo                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las imágenes construyen desde cero                                                                                    | `docker compose build` (local y CI)                                                                                                                                                                              |
| El stack levanta sano y `migrar` termina en 0                                                                         | `up --wait` + estado de `migrar`                                                                                                                                                                                 |
| SPA, fallback, health, 404 en formato único, cabeceras de seguridad, `Server` sin versión, API no root                | `scripts/docker-smoke.sh`                                                                                                                                                                                        |
| **E2E completa contra Nginx** (6 roles + flujos), **0 errores de consola**, lo que incluye cualquier violación de CSP | `E2E_BASE_URL=http://localhost:8080 npm run e2e`                                                                                                                                                                 |
| La IP real llega a la API detrás de Nginx                                                                             | Petición con `X-Forwarded-For` falso a `/api/v1/health`: Nginx lo **reemplaza** por la IP real del cliente (`$proxy_add_x_forwarded_for` agrega, `X-Real-IP` es la del cliente). Verificado en el log de la API. |
| La base de desarrollo no se toca                                                                                      | El humo usa `-p siset-smoke` con su propio volumen; al final, el volumen `siset_db` sigue existiendo                                                                                                             |
| Tamaño de la imagen de la API razonable (sin devDeps)                                                                 | `docker image ls`: se anota en el PR                                                                                                                                                                             |

**Deliberadamente sin test:** TLS (S0.9); el modo `VITE_USAR_API=true` dentro de Docker (ya lo cubre el
proyecto `api` de la E2E con la petición interceptada; la API real todavía no tiene `/auth`).

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)`
- [ ] `docker compose --profile completo up -d --build --wait` levanta db, api y web sanos; `migrar` termina en 0
- [ ] `docker compose up -d db` sigue funcionando igual (desarrollo)
- [ ] Prueba de humo y E2E contra el stack en verde, local y en la CI (job `docker`)
- [ ] API no root, solo lectura y sin capabilities; sin secretos reales en el repo
- [ ] PR a `main`; S0.4 en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                     | Gravedad | Mitigación                                                                                                                                  |
| -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| La CSP rompe algo de la SPA                                                | Media    | La E2E completa contra Nginx detecta violaciones (son errores de consola). Si hace falta, se relaja solo esa directiva y queda documentado. |
| `npm ci -w` con workspaces y `overrides` se comporta distinto en la imagen | Media    | Se copian todos los `package.json` de los workspaces y el lock; el build de la CI lo valida.                                                |
| Las imágenes `node:26`/`nginx:1.30` cambian de parche                      | Baja     | Tags con versión (`26.11.1-alpine3.24`, `1.30-alpine`); se actualizan con un PR.                                                            |
| El job `docker` alarga la CI                                               | Baja     | Corre en paralelo con los otros 3.                                                                                                          |
| El puerto 8080 está ocupado localmente                                     | Baja     | `WEB_PORT` configurable.                                                                                                                    |

---

## 7 · Preguntas abiertas

_(Ninguna para el cliente.)_ Se registra **DEC-008** (decisión interna): rol de BD separado en S6.4 y un
solo contenedor Nginx.

---

## Changelog

- **1.1 (2026-10-13)**:
  - **Fuente Inter servida desde la propia web.** La E2E contra Nginx detectó que la CSP bloqueaba
    `fonts.googleapis.com`, que se usaba en `index.html`. En lugar de relajar la CSP, la fuente pasa a
    `@fontsource-variable/inter` (OFL-1.1): se ve igual y no hace pedidos externos, lo que también sirve
    para la conexión intermitente de Ancocagua (RNF-12) y para RNF-09. Verificado: Inter cargada y 0
    pedidos a otros dominios.
  - **Instalación de producción de la API:** `npm ci --omit=dev --omit=optional --omit=peer` y sin el
    workspace web. `@prisma/client` declara el CLI de Prisma y TypeScript como peers opcionales, y el CLI
    arrastra Prisma Studio con React. La imagen baja de 513 MB a 281 MB; `node_modules`, de 357 MB a 102 MB.
  - **IP real detrás de Nginx:** Nginx **reemplaza** `X-Forwarded-For` por `$remote_addr`, en lugar de
    agregar a lo que mande el cliente. Con `TRUST_PROXY=1`, la API toma esa IP y no una falsificada. La
    lectura de `X-Forwarded-For` con `TRUST_PROXY` ya la cubre el test de S0.7.
- **1.0 (2026-10-13)**: aprobado.
