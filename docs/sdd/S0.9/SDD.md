# SDD — S0.9 · Staging con HTTPS en el VPS propio (provisional)

- **Ticket:** S0.9 (backlog 2026-10-12, Ola 2; se crea en ClickUp al aprobar este SDD).
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Borrador
- **Versión:** 1.0 · **Fecha:** 2026-10-13
- **Fuentes de verdad citadas:**
  1. `docs/product/PRD.md` §5 (Nginx con TLS, Docker Compose), RNF-10 (HTTPS obligatorio), RNF-11 (respaldos), D-12 (infraestructura definitiva sin definir)
  2. `docs/sdd/S0.4/SDD.md` v1.1 (imágenes, perfil `completo`, prueba de humo, E2E con `E2E_BASE_URL`)
  3. `docs/decisions/LOG.md` — DEC-005, DEC-008
  4. Inspección del VPS (solo lectura) del 2026-10-13: `franz@31.220.101.118`

---

## 1 · Alcance

### Entra

- Un **staging público con HTTPS** de SISET en el VPS Contabo: `https://siset-staging.vertexall.com`.
- Detrás del **Traefik de Coolify** que ya tiene el VPS, con certificado de Let's Encrypt (`certresolver letsencrypt`).
- Override `docker-compose.staging.yml`: sin puertos publicados, con etiquetas de Traefik, la red `coolify`, límites de CPU y memoria, y `X-Robots-Tag: noindex`.
- `scripts/desplegar-staging.sh`: despliega un commit concreto de `main` por SSH y después corre la prueba de humo y la E2E contra la URL pública.
- Nginx confía en el proxy (Traefik) para obtener la IP real del cliente (`real_ip`), para la bitácora.
- **Modo demo** (`VITE_USAR_API=false`, `VITE_DEMO=true`): sirve como **demo para el cliente (S0.1)** mientras la API no tenga endpoints de negocio.

### No entra (a propósito)

- **CD automático** (GitHub Actions → SSH en cada merge): necesita guardar una clave SSH del VPS como secret de GitHub. Se decide aparte (§7). Por ahora el despliegue es un comando.
- Respaldos de la BD de staging (RNF-11) → S6.10 / el servidor definitivo (D-12). La BD de staging solo tiene datos ficticios.
- Gestionarlo desde Coolify (UI): ver §2.1.
- Servidor definitivo de producción → D-12 / S6.10.

### Premisas verificadas (inspección del VPS, solo lectura)

| Premisa                   | Qué hay de verdad                                                                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Hay un VPS con SSH"      | ✅ Ubuntu 24.04, 4 vCPU, 7,8 GB de RAM (1,9 GB en uso), 81 GB libres. Docker 29.8 y Compose 5.6. El usuario `franz` está en el grupo `docker`; `sudo` pide contraseña (no se usa).                                                                             |
| Hay un proxy con TLS      | ✅ **Coolify 4.4.6 con Traefik 3.6** en 80/443, resolver `letsencrypt` (HTTP challenge) y red `coolify`.                                                                                                                                                       |
| DNS                       | ✅ `*.vertexall.com` → `31.220.101.118`; `siset-staging.vertexall.com` ya resuelve.                                                                                                                                                                            |
| Puertos de administración | ✅ 8000, 8080 y 6001 **no responden desde internet** (`cerrar-puertos-coolify.sh` + firewall).                                                                                                                                                                 |
| Otros sistemas en el VPS  | ⚠️ Corren **producción** de otros proyectos (subasta, ventafacil, vertexall, vf-saas) y dos staging manuales (`subasta-qa`, `vf-saas-prueba`). El despliegue de SISET **no puede afectarlos**: proyecto aparte, sin puertos de host y con límites de recursos. |
| Enrutamiento              | ⚠️ `vf-saas-prueba` captura **cualquier** subdominio de `vertexall.com` (`HostRegexp(^[a-z0-9-]+\.vertexall\.com$)`). El router de SISET necesita **prioridad explícita** más alta; si no, Traefik le daría el dominio a vf-saas.                              |
| Puerto 8080               | ⚠️ En el VPS lo usa Traefik. El compose de S0.4 publica la web en `127.0.0.1:8080`, así que el override **elimina** los puertos publicados (`!reset`).                                                                                                         |
| SISET ya desplegado       | ❌ No existe nada de SISET en el VPS.                                                                                                                                                                                                                          |

---

## 2 · Diseño técnico

### 2.1 Compose manual con etiquetas de Traefik, no recurso de Coolify

Es el mismo patrón que `subasta-qa` y `vf-saas-prueba`: el código queda versionado en el repo
(`docker-compose.staging.yml`), se puede reproducir con un comando y no depende de configuración que
solo vive en la base de Coolify. Las apps de producción del VPS siguen en Coolify sin cambios. Cuando se
defina el servidor definitivo (D-12), se decide si producción va por Coolify.

### 2.2 `docker-compose.staging.yml` (override sobre `docker-compose.yml`)

```yaml
name: siset-staging
services:
  db:
    ports: !reset [] # sin puerto en el host
    cpus: 1.0
    mem_limit: 768m
    restart: unless-stopped
  migrar:
    mem_limit: 512m
  api:
    environment:
      CORS_ORIGEN: https://siset-staging.vertexall.com
      LOG_LEVEL: info
    cpus: 1.0
    mem_limit: 512m
  web:
    ports: !reset []
    networks: [default, coolify]
    cpus: 0.5
    mem_limit: 256m
    labels:
      traefik.enable: 'true'
      traefik.docker.network: coolify
      # HTTP → HTTPS
      traefik.http.routers.siset-staging-http.rule: Host(`siset-staging.vertexall.com`)
      traefik.http.routers.siset-staging-http.entrypoints: http
      traefik.http.routers.siset-staging-http.priority: '1000'
      traefik.http.routers.siset-staging-http.middlewares: siset-staging-https
      traefik.http.middlewares.siset-staging-https.redirectscheme.scheme: https
      # HTTPS con Let's Encrypt; prioridad sobre el HostRegexp de vf-saas-prueba
      traefik.http.routers.siset-staging.rule: Host(`siset-staging.vertexall.com`)
      traefik.http.routers.siset-staging.entrypoints: https
      traefik.http.routers.siset-staging.tls: 'true'
      traefik.http.routers.siset-staging.tls.certresolver: letsencrypt
      traefik.http.routers.siset-staging.priority: '1000'
      traefik.http.routers.siset-staging.middlewares: siset-staging-cabeceras
      traefik.http.middlewares.siset-staging-cabeceras.headers.customresponseheaders.X-Robots-Tag: noindex, nofollow
      traefik.http.middlewares.siset-staging-cabeceras.headers.stsSeconds: '31536000'
      traefik.http.services.siset-staging.loadbalancer.server.port: '80'
networks:
  coolify:
    external: true
```

Build args de la web: `WEB_ORIGEN=https://siset-staging.vertexall.com` (que se usa como
`VITE_PUBLIC_URL`, así el QR del prototipo apunta al staging), `VITE_USAR_API=false` y `VITE_DEMO=true`.

### 2.3 IP real detrás de dos proxies

El camino es cliente → Traefik → Nginx (`web`) → API. Hoy Nginx pone `X-Forwarded-For = $remote_addr`,
que en staging sería la IP de Traefik. Se agrega a `siset.conf`:

```
set_real_ip_from 10.0.0.0/8;  set_real_ip_from 172.16.0.0/12;  set_real_ip_from 192.168.0.0/16;
real_ip_header X-Forwarded-For;
```

Así `$remote_addr` pasa a ser la IP del cliente cuando la conexión viene de una red interna (Traefik), y
la API sigue usando `TRUST_PROXY=1`, que confía solo en Nginx. Un cliente de internet no puede falsificar
la IP: su conexión llega a Traefik, no a Nginx, y Traefik pone la IP real.

### 2.4 Secretos en el servidor

`~/siset-staging/.env` (modo `600`, fuera del repo):

- `POSTGRES_PASSWORD`, generada **en el servidor** con `openssl rand -base64 32`. Nunca se imprime ni pasa por la conversación ni por el repo.
- `WEB_ORIGEN=https://siset-staging.vertexall.com`.

Seed opcional (Kardex inicial): con `SEED_KARDEX_PASSWORD` también generada en el servidor. Se lee con
`ssh … cat` solo si hace falta.

### 2.5 `scripts/desplegar-staging.sh [commit]` (corre desde la máquina del desarrollador)

1. Toma el commit: por defecto `origin/main` (tiene que existir en `main`, que pasó por la CI).
2. Por SSH:
   - La primera vez: `git clone` del repo público en `~/siset-staging`, crea el `.env` con la contraseña generada (§2.4) y aplica `chmod 600`.
   - Siempre: `git fetch` + `git checkout --detach <commit>`, y luego `docker compose -f docker-compose.yml -f docker-compose.staging.yml --profile completo up -d --build --wait`.
3. Verifica desde afuera:
   - `https://siset-staging.vertexall.com/api/v1/health` → 200, con certificado válido.
   - La prueba de humo de la URL pública: SPA, fallback, 404 en formato único, CSP, HSTS, `X-Robots-Tag`.
   - `E2E_BASE_URL=https://siset-staging.vertexall.com npm run e2e`.
4. Muestra el commit desplegado. **Rollback:** `desplegar-staging.sh <commit-anterior>`.

Para no afectar a los otros sistemas:

- Nombre de proyecto propio (`siset-staging`) y volumen propio.
- Ningún puerto de host.
- Límites de CPU y memoria (≈ 2,5 CPU y 2 GB en total).
- Antes y después del despliegue se verifica que `subasta.vertexall.com` y `ventafacil.vertexall.com` sigan respondiendo igual.

---

## 3 · Cambios por archivo/módulo

| Archivo                                              | Cambio                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `docker-compose.staging.yml`                         | **Nuevo** (§2.2).                                                                                                  |
| `apps/web/nginx/siset.conf`                          | `real_ip` (§2.3).                                                                                                  |
| `scripts/desplegar-staging.sh`                       | **Nuevo** (§2.5).                                                                                                  |
| `scripts/docker-smoke.sh`                            | Separar las comprobaciones HTTP en una función reutilizable contra una URL (`--url`), para usarlas con el staging. |
| `README.md`                                          | Sección "Staging".                                                                                                 |
| `docs/planning/2026-10-12-tickets/S0.9-staging.json` | Cuerpo del ticket (se crea en ClickUp al aprobar).                                                                 |
| VPS (`~/siset-staging`)                              | Clon del repo + `.env`. **Requiere autorización**: es un despliegue en un servidor compartido con producción.      |

---

## 4 · Plan de tests

| Caso                                                                                              | Cómo                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Certificado válido de Let's Encrypt para `siset-staging.vertexall.com`                            | `curl -v` / `openssl s_client` (emisor y vigencia)                                                                                     |
| HTTP redirige a HTTPS                                                                             | `curl -I http://…` → 301/308 a `https://`                                                                                              |
| El dominio lo sirve SISET y no vf-saas (prioridad del router)                                     | `GET /` contiene `<title>` de SISET; `GET /api/v1/health` → `{"bd":"ok"}`                                                              |
| Comprobaciones de humo contra la URL pública (CSP, HSTS, noindex, 404 en formato único, fallback) | `docker-smoke.sh --url https://…`                                                                                                      |
| **E2E completa contra el staging público** (6 roles + flujos, 0 errores de consola)               | `E2E_BASE_URL=https://siset-staging.vertexall.com npm run e2e`                                                                         |
| La IP real llega a la API                                                                         | Una petición al staging deja en el log de la API la IP pública del cliente, no la de Traefik                                           |
| **Los otros sistemas no se afectan**                                                              | `subasta.vertexall.com` y `ventafacil.vertexall.com`: mismo código HTTP antes y después; contenedores de otros proyectos sin reinicios |
| Re-despliegue y rollback                                                                          | Desplegar el mismo commit dos veces (idempotente) y volver a uno anterior                                                              |
| `.env` no legible por otros y sin contraseñas impresas                                            | `stat -c %a` = 600; la salida del script no contiene la contraseña                                                                     |

---

## 5 · Definition of Done

- [ ] SDD con Estado = `Aprobado (fecha)` y autorización para desplegar en el VPS
- [ ] `https://siset-staging.vertexall.com` sirve SISET con un certificado válido
- [ ] Humo y E2E contra el staging público en verde
- [ ] Los otros sistemas del VPS sin cambios (verificado antes y después)
- [ ] `scripts/desplegar-staging.sh` en el repo, documentado en el README
- [ ] PR a `main`; S0.9 creada en ClickUp → "necesita revisión"

---

## 6 · Riesgos

| Riesgo                                                                                        | Gravedad | Mitigación                                                                                                                                                          |
| --------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Afectar producción de otros proyectos en el mismo VPS (recursos, puertos, routers de Traefik) | **Alta** | Proyecto, red y volumen propios; ningún puerto de host; límites de CPU y memoria; router con nombre único y regla `Host` exacta; verificación antes y después (§4). |
| El HostRegexp de vf-saas-prueba gana el dominio                                               | Media    | `priority: 1000` en los routers de SISET, verificado en §4.                                                                                                         |
| Let's Encrypt no emite el certificado (límite de tasa, HTTP challenge)                        | Baja     | El dominio ya resuelve al VPS y Traefik ya emite para los otros; si falla, se ve en los logs de `coolify-proxy`.                                                    |
| El build en el VPS consume CPU mientras otros sistemas atienden tráfico                       | Media    | El build de las dos imágenes tarda unos 2 minutos. Alternativa futura: construir en la CI y publicar en GHCR (como subasta), junto con el CD de §7.                 |
| El staging es público con datos ficticios                                                     | Baja     | `noindex`; los datos son los mocks del prototipo. Si se prefiere, basic auth de Traefik (§7).                                                                       |

---

## 7 · Preguntas abiertas (para el responsable, no bloquean)

1. **Dominio:** se propone `siset-staging.vertexall.com`. ¿Otro (por ejemplo, `siset.vertexall.com`)?
2. **¿Acceso con usuario y contraseña** (basic auth en Traefik) o público con `noindex`? Público facilita la demo con el cliente (S0.1).
3. **CD automático:** ¿se guarda una clave SSH de despliegue como secret de GitHub para desplegar en cada merge a `main`? Si sí, va en un ticket aparte, con una clave dedicada y restringida.
