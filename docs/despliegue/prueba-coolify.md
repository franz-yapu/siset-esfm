# Despliegue de prueba en Coolify

Entorno **de prueba con datos ficticios** en `https://siset.vertexall.com` (SDD S0.12, DEC-036). Misma forma que
Ventas Fácil: un servicio docker-compose de Coolify con imágenes públicas de GHCR. Cloudflare es solo DNS
(`*.vertexall.com` → VPS, sin proxy) y el certificado lo saca Traefik (Let's Encrypt).

> No es producción: no hay respaldos (S6.10) y los datos se pueden borrar en cualquier momento.

## Piezas

| Pieza                                     | Qué hace                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `.github/workflows/publicar-imagenes.yml` | A mano: publica `siset-api`, `siset-migrar` y `siset-web` con las etiquetas `prueba` y `AAAA.MM.DD-sha`. |
| `deploy/coolify/docker-compose.yml`       | `db`, `migrar` (una vez por despliegue), `api` y `web` (el dominio va en `web`).                         |
| `apps/api/prisma/datos-prueba.ts`         | Personal, 30 files y 8 hojas de ruta ficticios; solo con `DATOS_PRUEBA=1`; idempotente.                  |

## Primera vez

1. GitHub → Actions → **Publicar imágenes** → _Run workflow_ (dominio `siset.vertexall.com`).
2. GitHub → Packages: marcar `siset-api`, `siset-migrar` y `siset-web` como **públicos** (Package settings →
   Change visibility). Así Coolify los baja sin credenciales.
3. Coolify → Keys & Tokens: crear un token de la API y guardarlo en el VPS en `~/.coolify-token` (permisos 600).
4. Desde el VPS (la API de Coolify escucha en `localhost:8000`): crear el proyecto `siset` y un servicio
   docker-compose con el contenido de `deploy/coolify/docker-compose.yml`, poner `https://siset.vertexall.com` en
   `web` y desplegar.
5. Esperar a que `migrar` termine (`exited 0`) y que `api` y `web` estén sanos.

## Actualizar

1. Correr **Publicar imágenes** otra vez (pisa la etiqueta `prueba`).
2. Coolify → servicio `siset` → **Redeploy** (o `GET /api/v1/deploy?uuid=<uuid>&force=true` con el token).
   `migrar` aplica las migraciones nuevas; el seed y los datos de prueba no duplican nada.

Volver a una versión anterior: cambiar `:prueba` por `:AAAA.MM.DD-sha` en el compose del servicio y redesplegar.

## Credenciales

Son públicas a propósito: el login de la prueba las muestra en el recuadro "Usuarios de prueba" (SDD S0.12 §2.5).
Contraseña de todas: `Prueba.2026`.

| Usuario (CI) | Rol         | Sede      |
| ------------ | ----------- | --------- |
| 9000001      | KARDEX      | ANCOCAGUA |
| 9000002      | SEC_DIR     | LA_PAZ    |
| 9000003      | SEC_COORD   | ANCOCAGUA |
| 9000004      | COORDINADOR | ANCOCAGUA |

Cada despliegue las repara (`bd:datos-prueba`): vuelve la contraseña común, sin cambio obligatorio, sin bloqueo y
sin sesiones. Si alguien cambió una contraseña o bloqueó una cuenta, basta con redesplegar. El resto de los datos
(files, hojas de ruta, bitácora) no se reinicia.

## Verificación

```bash
curl -s https://siset.vertexall.com/api/v1/health          # {"estado":"ok","bd":"ok",...}
curl -sI https://ventafacil.vertexall.com | head -1         # los otros sistemas siguen respondiendo
```

Y a mano: el recuadro de cuentas debajo del login, entrar con cada rol, búsqueda de files, detalle con su semáforo.

## Qué está conectado

Conectado a la API: sesión, usuarios, bitácora y files (búsqueda, detalle, requisitos, bloqueo). Las pantallas de
trámites, pases y emisión todavía muestran los **datos de ejemplo del prototipo** hasta S3.8, S3.9 y S5.x.
