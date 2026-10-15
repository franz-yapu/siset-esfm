# SDD — S0.12 · Despliegue de prueba en Coolify con datos de prueba

- **Ticket:** ClickUp **S0.12** (`868mh1kuh`, https://app.clickup.com/t/868mh1kuh), rehecho: el responsable pidió el 2026-10-14 un despliegue **de prueba** "igual que Ventas Fácil" (Coolify, Cloudflare) y **con datos de prueba**.
- **Autor:** generado con Claude (Entregable 1).
- **Estado:** Aprobado (2026-10-14, v1.2)
- **Versión:** 1.2 · **Fecha:** 2026-10-14
- **Fuentes de verdad citadas:**
  1. Inspección del VPS en solo lectura (2026-10-14): Ventas Fácil producción es un **servicio docker-compose de Coolify** (`db`, `api`, `web`) con imágenes de **GHCR**, el dominio por `SERVICE_FQDN_WEB_80`, contraseñas por `${SERVICE_PASSWORD_*}` y Let's Encrypt de Traefik. **Cloudflare es solo DNS**: `*.vertexall.com` apunta directo al VPS (`31.220.101.118`), sin proxy. Recursos libres: 5,8 GB de RAM, 81 GB de disco.
  2. `docs/sdd/S0.4/SDD.md` (imágenes y `migrar`), `docs/sdd/S0.9/SDD.md` (staging: compose manual; queda como alternativa), `docs/sdd/S6.4/SDD.md` (rol `siset_app`), DEC-008, DEC-017, DEC-019 #1
  3. Decisiones del responsable (2026-10-14): servicio creado **por la API de Coolify** con un token; **imágenes públicas**; dominio **`siset.vertexall.com`**.

---

## 1 · Alcance

### Entra

- **Imágenes en GHCR**: workflow `publicar-imagenes.yml` (a mano, `workflow_dispatch`) que construye `ghcr.io/franz-yapu/siset-api`, `siset-migrar` y `siset-web` y las etiqueta `prueba` y `AAAA.MM.DD-<sha>`. Públicas.
- **Compose para Coolify** (`deploy/coolify/docker-compose.yml`), con la forma del de Ventas Fácil: `db`, `migrar` (una sola vez: migraciones, rol de la app, seed y datos de prueba), `api` y `web`.
- **Datos de prueba** (`apps/api/prisma/datos-prueba.ts`), ficticios e idempotentes: el personal de cada rol, ~30 files con requisitos variados (completos, pendientes, observados, dos bloqueados) y ~8 hojas de ruta en distintos pasos de los dos flujos.
- **Creación y despliegue** del servicio por la API de Coolify, y verificación: HTTPS, login, prueba de humo, y que los demás sistemas del VPS sigan respondiendo.
- Runbook `docs/despliegue/prueba-coolify.md`.

### No entra (a propósito)

- **Datos reales** y **respaldos** (S6.10): este despliegue es de prueba, con datos ficticios.
- CD automático en cada merge: el despliegue es un comando (workflow + redeploy en Coolify).
- Las pantallas de trámites, pases y emisión siguen siendo las del prototipo hasta S3.8, S3.9 y S5.x: muestran sus datos de ejemplo (ver §6).

---

## 2 · Diseño técnico

### 2.1 Imágenes

- `apps/api/Dockerfile` y `apps/web/Dockerfile` (S0.4), sin cambios. La web se construye con `VITE_USAR_API=auth,usuarios,bitacora,files` (lo conectado hoy), `VITE_DEMO=false` (sin "usuarios de prueba" ni "Ver como") y `VITE_PUBLIC_URL=https://siset.vertexall.com`.
- El workflow corre con `GITHUB_TOKEN` (`packages: write`). La primera vez, el responsable marca los tres paquetes como **públicos** en GitHub (un clic cada uno); después, Coolify los baja sin credenciales.

### 2.2 Compose (forma de Ventas Fácil)

```yaml
services:
  db: # postgres:16-alpine, volumen siset-pgdata, healthcheck; POSTGRES_PASSWORD=${SERVICE_PASSWORD_POSTGRES}
  migrar: # imagen siset-migrar (target build del Dockerfile de la api); una sola vez; exclude_from_hc: true
    # migrate deploy → bd:rol-app → seed → datos de prueba (DATOS_PRUEBA=1)
  api: # imagen api; DATABASE_URL con siset_app y ${SERVICE_PASSWORD_64_APPDB}; JWT_SECRET=${SERVICE_PASSWORD_64_JWT};
    # CORS_ORIGEN=https://siset.vertexall.com; TRUST_PROXY=1; depends_on migrar (completed_successfully)
  web: # imagen web (Nginx, proxy /api → api:3000); SERVICE_FQDN_WEB_80 (Coolify pone el dominio y el certificado)
```

- **Contraseñas**: las genera Coolify y nunca están en el repo. La del Kardex inicial y la del personal de prueba se arman como `K-1${SERVICE_PASSWORD_KARDEX}` y `P-1${SERVICE_PASSWORD_PRUEBA}`, para cumplir la política de DEC-011 (letra, número y símbolo). Se las paso al responsable al terminar, fuera del chat (en un archivo del VPS con permisos 600).
- **Límites** de CPU y memoria como S0.9 (el VPS es compartido).

### 2.3 Datos de prueba

`datos-prueba.ts` se ejecuta solo con `DATOS_PRUEBA=1` y no hace nada si ya existen (idempotente: se puede volver a desplegar). Crea:

| Qué              | Cuántos | Detalle                                                                                               |
| ---------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Personal         | 3       | SEC_DIR (La Paz), SEC_COORD y COORDINADOR (Ancocagua); el Kardex inicial lo crea el seed              |
| Files            | 30      | Nombres y CI ficticios; 22 egresados y 8 estudiantes; las 5 especialidades; años de ingreso 2018–2025 |
| Requisitos       | varios  | Mezcla de completos, pendientes y observados, para ver los tres colores del semáforo                  |
| Files bloqueados | 2       | Con motivo de permiso obligatorio (D-07b)                                                             |
| Hojas de ruta    | 8       | De los 4 tipos, en distintos pasos de los dos flujos, con sus movimientos (usan el correlativo real)  |

Los datos se cargan directo en la base (sin eventos de bitácora): la bitácora empieza vacía y registra lo que se haga en la prueba.

### 2.4 Creación por la API de Coolify

El responsable crea un **token de la API** en Coolify (Keys & Tokens) y lo deja en el VPS en `~/.coolify-token` (permisos 600), así no pasa por el chat. Desde el VPS (la API de Coolify escucha en `localhost:8000`, cerrada a internet):

1. Crear un proyecto `siset` y un servicio docker-compose con el compose del §2.2 y el dominio `https://siset.vertexall.com`.
2. Desplegar y esperar a que `migrar` termine y `api` y `web` estén sanos.
3. Verificar: certificado válido, `GET /api/v1/health`, login del Kardex, una búsqueda de files y que Ventas Fácil, Subasta y vertexall sigan respondiendo.

### 2.5 Cuentas de prueba visibles en el login (v1.2)

Pedido del responsable (2026-10-14): que quien pruebe el sistema (el estudiante para el que se hace el proyecto)
encuentre **debajo del login** las cuentas de cada rol con su usuario y contraseña.

- **Web:** variable de build `VITE_CUENTAS_PRUEBA=true` (solo la pone el workflow _Publicar imágenes_). Con ella, el
  login muestra el mismo recuadro plegable "Usuarios de prueba" de la demo, con aviso "Entorno de prueba con datos
  ficticios", las 4 cuentas del personal (KARDEX, SEC_DIR, SEC_COORD, COORDINADOR: CI, nombre, rol y sede) y la
  contraseña común. Clic en una fila autocompleta usuario y contraseña. La lista está en
  `apps/web/src/config/cuentas-prueba.ts`. Sin la variable (producción) el recuadro no existe.
- **Contraseña común fija:** `Prueba.2026` (cumple DEC-011). Ya no la genera Coolify: se publica en la pantalla,
  así que tenerla en el repo no cambia nada. Va en el compose como literal de `DATOS_PRUEBA_PASSWORD`.
- **Las cuentas se reparan en cada despliegue:** `bd:datos-prueba` corre siempre (aunque los datos ya estén) un paso
  que deja las 4 cuentas con la contraseña común, `debe_cambiar_password = false`, activas, sin intentos fallidos ni
  bloqueo, y revoca sus sesiones. Incluye al Kardex del seed (9000001), que en este entorno no pide cambiar la
  contraseña. Si alguien cambia una contraseña o bloquea una cuenta probando, un redespliegue la arregla.
- **No hay cuentas de estudiante ni de egresado:** el sistema no las tiene (DEC-032); el estudiante consulta su
  trámite en `/seguimiento` sin iniciar sesión (S4.x). El recuadro lo dice.
- **Buscadores:** hoy el sitio **no** tiene `noindex`. Con `VITE_CUENTAS_PRUEBA=true`, `vite.config.ts` agrega
  `<meta name="robots" content="noindex, nofollow">` al `index.html`, para que las contraseñas no salgan en Google.
  Que cualquiera con el enlace pueda entrar es aceptable con datos ficticios (§6).

| Archivo                                                                    | Cambio                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `apps/web/src/config/cuentas-prueba.ts`, `vite-env.d.ts`, `vite.config.ts` | **Nuevo**: lista de cuentas y contraseña; tipo de la var.  |
| `apps/web/src/pages/publicas/Login.tsx`                                    | El recuadro acepta la lista y la contraseña; aviso.        |
| `apps/api/prisma/datos-prueba.ts`                                          | `repararCuentasPrueba` (siempre).                          |
| `deploy/coolify/docker-compose.yml`, `publicar-imagenes.yml`               | Contraseña fija; `VITE_CUENTAS_PRUEBA=true`.               |
| Tests: `Login.test.tsx`, `test/bd/datos-prueba.test.ts`                    | Recuadro con y sin la variable; reparación de las cuentas. |

---

## 3 · Cambios por archivo

| Archivo                                                      | Cambio                                        |
| ------------------------------------------------------------ | --------------------------------------------- |
| `.github/workflows/publicar-imagenes.yml`                    | **Nuevo** (§2.1).                             |
| `deploy/coolify/docker-compose.yml`                          | **Nuevo** (§2.2).                             |
| `apps/api/prisma/datos-prueba.ts`, `apps/api/package.json`   | **Nuevo** script y comando `bd:datos-prueba`. |
| `apps/api/test/bd/datos-prueba.test.ts`                      | **Nuevo** (§4).                               |
| `docs/despliegue/prueba-coolify.md`, `docs/decisions/LOG.md` | Runbook y DEC-036.                            |

---

## 4 · Plan de tests

| Caso                                                                                                                     | Nivel  |
| ------------------------------------------------------------------------------------------------------------------------ | ------ |
| `datos-prueba` crea lo del §2.3 y una segunda corrida no duplica nada                                                    | BD     |
| Los semáforos resultantes incluyen verde, amarillo y rojo; las hojas de ruta respetan la máquina (ADR-0005)              | BD     |
| Las imágenes se construyen en la CI (el job `docker` ya lo prueba)                                                       | CI     |
| Después del despliegue: HTTPS válido, health, login, búsqueda de files, y los otros sistemas del VPS siguen respondiendo | Manual |

---

## 5 · Definition of Done

- [ ] SDD en `docs/sdd/S0.12/SDD.md`, Estado = Aprobado.
- [ ] Imágenes públicas en GHCR; servicio `siset` en Coolify con `https://siset.vertexall.com`.
- [ ] Datos de prueba cargados; credenciales entregadas al responsable fuera del chat.
- [ ] Verificación del §4 y de los otros sistemas del VPS.
- [ ] Runbook y DEC-036; quality gate en verde; commit `S0.12 …` en `feat/S0.12-despliegue-prueba`.

---

## 6 · Riesgos

| Riesgo                                                                                    | Gravedad | Mitigación                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Afectar a los sistemas en producción del VPS                                              | Media    | Servicio separado, límites de CPU y memoria, dominio propio; verificación de los otros sistemas al final.                                       |
| Las pantallas de trámites muestran los datos de ejemplo del prototipo, no los de la base  | Media    | Se avisa en el runbook y al responsable; se conectan con S3.8, S3.9 y S5.x.                                                                     |
| `siset.vertexall.com` queda abierto a internet                                            | Baja     | Solo datos ficticios; contraseñas generadas por Coolify; `noindex`. Producción tendrá otro dominio o este con datos reales y respaldos (S6.10). |
| Las variables mágicas de Coolify no se interpolan como se espera (prefijos de contraseña) | Baja     | Se verifica el login al terminar; si falla, se ajusta el compose y se redespliega.                                                              |

---

## 7 · Preguntas abiertas

- **Para el responsable:** crear el token de la API de Coolify y dejarlo en `~/.coolify-token` del VPS; marcar los tres paquetes de GHCR como públicos después de la primera publicación.
- **DEC-036 (va a `LOG.md`):** despliegue de prueba en Coolify como servicio docker-compose (forma de Ventas Fácil), con imágenes públicas de GHCR, dominio `siset.vertexall.com`, Cloudflare solo DNS y datos de prueba ficticios. Reemplaza el despliegue manual de S0.9 para este entorno.

---

## Changelog

- **1.1 (2026-10-14):** la imagen de `migrar` se publica aparte (`siset-migrar`, target `build`), porque la de la api
  (target `runtime`) no trae Prisma CLI ni `tsx`: son tres paquetes, no dos. La contraseña de `siset_app` pasa a
  `${SERVICE_PASSWORD_64_APPDB}`: `bd:rol-app` exige 16 caracteres o más y la prueba local con una clave corta falló.
- **1.2 (2026-10-14, aprobada):** §2.5, cuentas de prueba visibles debajo del login, con contraseña común fija y
  reparación de las cuentas en cada despliegue. Al implementar: `apps/web/Dockerfile` recibe el `ARG
VITE_CUENTAS_PRUEBA`, y el test de la web es `src/config/cuentas-prueba.test.ts` (la web no tiene tests de
  componentes; el recuadro se verifica en el despliegue).
