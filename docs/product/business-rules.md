# Reglas de negocio — SISET

Reglas finas que el código debe respetar. Fuente: PRD §2–§5. Las marcadas con
D-xx son provisionales hasta que el Registro de Dudas las cierre.

## Hoja de ruta — máquina de estados (PRD §3, D-05)

Estados: `REGISTRADO → EN_TRANSITO → RECIBIDO → EN_REVISION ⇄ OBSERVADO → DICTAMINADO → EN_IMPRESION → EN_TRANSITO_LA_PAZ → EN_FIRMA → LISTO → ENTREGADO`.

| Transición | Rol | Condición |
|---|---|---|
| → Registrado | SEC_DIR | Valorado canjeado, file existente, file no bloqueado |
| Registrado → En tránsito | SEC_DIR | Crea pase La Paz → Ancocagua |
| En tránsito → Recibido | SEC_COORD o KARDEX | Confirma recepción del pase |
| Recibido → En revisión | KARDEX | Toma el trámite |
| En revisión → Observado | KARDEX | Requisito faltante o file bloqueado (motivo obligatorio) |
| Observado → En revisión | KARDEX | Requisito subsanado |
| En revisión → Dictaminado | COORDINADOR | File sin bloqueo y requisitos completos |
| Dictaminado → En impresión | KARDEX | Dictamen = Aprobado |
| En impresión → En tránsito a La Paz | KARDEX | Documento emitido; crea pase de retorno |
| En tránsito a La Paz → En firma → Listo → Entregado | SEC_DIR | Recepción, firmas y entrega |

- Cualquier otra transición → **409**.
- Cada transición inserta un `movimiento_hoja_ruta` (estado anterior/nuevo, sede, usuario, observación, fecha) en la misma transacción.
- Cambiar estado usa `SELECT … FOR UPDATE` (dos usuarios no mueven el mismo trámite a la vez).
- Solo se envía un pase de un trámite que está en la sede del usuario.

## Correlativo

- `HR-AAAA-NNNNNN`, único por gestión, generado dentro de la transacción de ingesta (sin huecos por concurrencia).

## File académico, semáforo y bloqueo (RF-07, D-04, D-07, D-18)

- Requisitos en catálogo parametrizable `requisito_tipo` (TACFI, TCLO, CERT_NOTAS…), editable por Kardex.
- Semáforo por requisito y global: verde (completo), amarillo (pendiente/parcial), rojo (faltante obligatorio o bloqueo).
- TCLO pasa a "Completo" solo con el nivel exigido (D-04, por definir).
- Notas: se registra el resultado anual (APROBADO/REPROBADO + n.º de UF reprobadas), no cada nota (D-07).
- UF reprobadas > límite configurable → file **BLOQUEADO**: no se puede ingresar trámite, dictaminar ni emitir.
- Desbloqueo exige motivo y queda en bitácora.

## Dictamen y emisión (RF-12, RF-13, D-11)

- Dictamen = APROBADO u OBSERVADO, con observación; solo trámites de egresado.
- No se emite documento sin dictamen aprobado.
- Cada impresión registra n.º de valorado y usuario; reimprimir exige motivo.
- Vista previa siempre con marca de agua "VISTA PREVIA".

## Seguridad y acceso

- Login con CI + contraseña (D-14). 5 intentos fallidos → bloqueo 15 min. Rate limit 10/min por IP.
- Access JWT 15 min + refresh rotado en cookie httpOnly/Secure/SameSite=Strict; 15 min de inactividad = cierre.
- Contraseña: bcrypt costo ≥ 12, mín. 8 caracteres con letras y números. Reseteo por Kardex obliga a cambiarla.
- "Propio" se valida en backend (ESTUDIANTE/EGRESADO no leen otro file cambiando el id).
- Tracking público: N.º + CI, mismo error para N.º o CI incorrecto (anti-enumeración), solo nombre y estados.
- Usuarios: baja lógica, nunca DELETE. CI único.

## Bitácora (RF-14, D-17)

- La API registra el evento en la misma transacción (fecha, usuario, IP, acción, módulo, entidad, antes/después JSONB).
- `log_auditoria` no admite UPDATE ni DELETE (permisos de BD).

## Convenciones de datos

- `id BIGSERIAL`, `TIMESTAMPTZ` en America/La_Paz, `created_at`/`updated_at` en tablas operativas.
- FK `ON DELETE RESTRICT`, borrado lógico.
- Errores de API: `{ "error": { "code", "message", "details" } }`.
