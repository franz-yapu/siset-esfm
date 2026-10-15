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

Las contraseñas las genera Coolify (`SERVICE_PASSWORD_*`); no están en el repo.

| Usuario (CI) | Rol         | Sede      | Contraseña                                              |
| ------------ | ----------- | --------- | ------------------------------------------------------- |
| 9000001      | KARDEX      | ANCOCAGUA | `K-1` + `SERVICE_PASSWORD_KARDEX` (cambiarla al entrar) |
| 9000002      | SEC_DIR     | LA_PAZ    | `P-1` + `SERVICE_PASSWORD_PRUEBA`                       |
| 9000003      | SEC_COORD   | ANCOCAGUA | `P-1` + `SERVICE_PASSWORD_PRUEBA`                       |
| 9000004      | COORDINADOR | ANCOCAGUA | `P-1` + `SERVICE_PASSWORD_PRUEBA`                       |

Los valores se ven en Coolify (servicio → Environment Variables) y se dejan al responsable en
`~/siset-prueba-credenciales.txt` del VPS (permisos 600).

## Verificación

```bash
curl -s https://siset.vertexall.com/api/v1/health          # {"estado":"ok","bd":"ok",...}
curl -sI https://ventafacil.vertexall.com | head -1         # los otros sistemas siguen respondiendo
```

Y a mano: login del Kardex (pide cambiar la contraseña), búsqueda de files, detalle con su semáforo.

## Qué está conectado

Conectado a la API: sesión, usuarios, bitácora y files (búsqueda, detalle, requisitos, bloqueo). Las pantallas de
trámites, pases y emisión todavía muestran los **datos de ejemplo del prototipo** hasta S3.8, S3.9 y S5.x.
