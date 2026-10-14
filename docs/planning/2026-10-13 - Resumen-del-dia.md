# SISET — Resumen del día (2026-10-13)

## Mergeado en `main` (PR #12 a #23)

| Tarea | PR | Qué quedó | DEC |
| --- | --- | --- | --- |
| S0.1 | #12, #20 | D-27 en la hoja; DEC-009 (piloto en noviembre); **17 respuestas de la escuela** registradas en `dudas.md`; 5 repreguntas en la hoja (D-07b, D-12b, D-04b, D-13b, D-14b) | 009, 018 |
| S1.1 | #13 → #14 | Tablas `refresh_token` (solo el hash) y `parametro` (5 intentos, 15 min) | 010 |
| S1.2 + S1.7 | #15 | bcrypt costo 12; contraseña con **letras, números y símbolos** (pedido del responsable), máx. 72 bytes; eventos de acceso cerrados | 011 |
| S1.3 | #16 | `POST /auth/login`: access JWT 15 min (`jose`), refresh 8 h en cookie httpOnly; el mismo 401 para todo rechazo; `JWT_SECRET` obligatorio | 012 |
| S1.4 | #17 | Bloqueo tras 5 intentos (15 min) y rate limit 10/min por IP | 013 |
| S1.5 | #18 | Refresh con rotación y detección de reuso, logout, cambio de contraseña, middleware `autenticar` | 014 |
| S1.6 | #19 | Autorización con Casbin (matriz del PRD, 216 combinaciones probadas), `cpw` obligatorio, `exigirPropio`/`exigirSede`, `GET /auth/mis-permisos` | 015 |
| S2.1 | #21 | Tablas `file_academico`, `requisito_file`, `requisito_tipo` (catálogo por año y nivel: TACFI_1/2, TCLO_BASICO/INTERMEDIO/AVANZADO, CERT_NOTAS) | 016 |
| S6.4 | #22 | La API se conecta como `siset_app` (sin UPDATE/DELETE/TRUNCATE en la bitácora); `GET /auditoria` con filtros; convención de paginación | 017 |
| S1.3b | #23 | Intentos con un CI inexistente registrados en la bitácora (D-26) | 018 #2 |

## Decisiones del responsable hoy

- Contraseña: mínimo 8 caracteres con letras, números y símbolos (DEC-011).
- Las decisiones técnicas las toma el desarrollo; a la escuela solo van decisiones de flujo o críticas.
- **No se despliega** (S0.12/S0.13) hasta tener al menos el flujo completo de un rol.
- Doble verificación (D-03): app TOTP, exigida desde el sistema completo, no en el piloto (DEC-018 #1, ticket S2.15).

## Tickets nuevos en ClickUp

- S1.3b (hecho, #23) y **S2.15 Doble verificación TOTP** (Sprint 2, 8–10 h).

## Pendiente para mañana

1. **S1.8 API de usuarios**: SDD en Borrador en la rama `feat/S1.8-api-usuarios` (`docs/sdd/S1.8/SDD.md`). Falta la aprobación del responsable; después, implementar.
2. Después de S1.8, para el flujo completo de Kardex: S1.9 (login y cambio de contraseña conectados en la web), S1.10 (sesión real e inactividad), S1.11 (rutas por rol), S1.13 (pantalla de usuarios), S6.5 (pantalla de bitácora), S1.14 (pruebas de auth).
3. Revisar en la hoja las respuestas a las 5 repreguntas. La más urgente es **D-12b** (si aceptan un servidor externo): sin ella no hay piloto con datos reales.
4. Pendientes del roadmap: actualizar estados y horas en `2026-10-13 - Sprint-Roadmap.md` con lo hecho hoy.

## Notas del entorno

- Usar Node 26 (`~/.nvm/versions/node/v26.11.1/bin`); el `node` por defecto de la shell es el 22.
- `.env` locales (raíz y `apps/api`): ya tienen `JWT_SECRET` y `APP_DB_PASSWORD` de desarrollo. **Falta agregar un símbolo a `SEED_KARDEX_PASSWORD`** para que el seed no falle.
- Base local: nunca `migrate reset`. Si `migrate dev` pide resetear por una rama con migraciones distintas, escribir la migración a mano y verificarla con `npm run test:bd`.
- Los PR que agregan una DEC al final de `LOG.md` chocan entre sí: mergearlos de a uno, con "Create a merge commit".
