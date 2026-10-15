# Reglas de negocio — SISET

Reglas finas que el código debe respetar. Fuente: PRD §2–§5. Las marcadas con
D-xx son provisionales hasta que el Registro de Dudas las cierre.

## Hoja de ruta — máquina de estados (DEC-033, DEC-034, ADR-0005)

Dos flujos según el tipo de trámite (D-05). La tabla completa vive en `apps/api/src/modulos/hojas-ruta/maquina.ts`.

- **Con valorado** (historial académico, legalización de historial):
  `RECIBIDO → AVISADO_KARDEX → EN_IMPRESION → IMPRESO → FIRMADO_DIR_ACADEMICA → LISTO → ENTREGADO`.
- **Sin valorado** (certificados de notas y de excelencia de años pasados):
  `RECIBIDO → AVISADO_KARDEX → EN_IMPRESION → IMPRESO → FIRMADO_COORDINADOR → REMITIDO_CALAHUMANA → LISTO → ENTREGADO`.

| Paso (acción)                                         | Rol         | Sede      | Flujo        |
| ----------------------------------------------------- | ----------- | --------- | ------------ |
| Ingesta → Recibido (S3.4)                             | SEC_DIR     | LA_PAZ    | los dos      |
| Avisar a Kardex                                       | SEC_DIR     | LA_PAZ    | los dos      |
| Recoger (Kardex retira el valorado o el pedido)       | KARDEX      | ANCOCAGUA | los dos      |
| Imprimir                                              | KARDEX      | ANCOCAGUA | los dos      |
| Firma de Dirección Académica (la anota SEC_DIR, D-33) | SEC_DIR     | LA_PAZ    | con valorado |
| Firma de Dirección General → Listo                    | SEC_DIR     | LA_PAZ    | con valorado |
| Firma del Coordinador (D-11)                          | COORDINADOR | ANCOCAGUA | sin valorado |
| Remitir a Calahumana                                  | KARDEX      | ANCOCAGUA | sin valorado |
| Recibir en Calahumana → Listo                         | SEC_DIR     | LA_PAZ    | sin valorado |
| Entregar                                              | SEC_DIR     | LA_PAZ    | los dos      |

- Paso que el estado o el flujo no admiten → **409** `TRANSICION_INVALIDA`; otro rol u otra sede → **403**.
- Un file **bloqueado** (DEC-029) impide los pasos hasta imprimir → **422** `FILE_BLOQUEADO`.
- Cada paso inserta un `movimiento_hoja_ruta` (solo inserción) y un evento `CAMBIAR_ESTADO` en la misma transacción;
  un trigger copia el estado y la sede a la hoja. Se usa `SELECT … FOR UPDATE`.
- No hay dictamen (D-11) ni, por ahora, estado Observado (D-34) ni bandeja de pases (D-35).

## Correlativo

- `HR-AAAA-NNNNNN`, único por gestión (año en La Paz), generado en la base dentro de la transacción de la ingesta
  con `fn_siguiente_nro_hoja_ruta`: sin huecos ni repetidos (ADR-0006, DEC-035).

## Ingesta (RF-08, DEC-035)

- La registra **SEC_DIR desde Calahumana** (sede LA_PAZ; D-32 pregunta por los certificados).
- **N.º de valorado** obligatorio solo si el tipo lo requiere (historial y legalización); los certificados no lo
  llevan (D-05).
- El file debe existir, ser de un **egresado** (provisional, D-09) y **no estar bloqueado** (DEC-029).
- Deja el trámite en `RECIBIDO`, con su primer movimiento (`REGISTRAR`) y el evento `CREAR`.

## File académico, semáforo y bloqueo (RF-07, D-04, D-07, D-18)

- Requisitos en catálogo parametrizable `requisito_tipo` (TACFI, TCLO, CERT_NOTAS…), editable por Kardex.
- Semáforo por requisito y global (DEC-031, calculado en la API; provisional hasta D-31). Solo cuentan los
  requisitos obligatorios. Rojo: file bloqueado o algún requisito OBSERVADO. Amarillo: algún requisito pendiente.
  Verde: todos completos. Cuándo un pendiente pasa a "atrasado" (rojo) lo define D-31.
- TCLO pasa a "Completo" solo con el nivel exigido (D-04, por definir).
- Notas: Kardex **no registra notas**; las cargan los docentes en un sistema del Ministerio (D-07). Reprobar no
  obliga a repetir TACFI ni TCLO (D-07b).
- **Bloqueo (D-07b, DEC-029):** Kardex bloquea el file, con un motivo, cuando el estudiante recibe el **permiso
  obligatorio por una gestión** (por reprobación o porque no existe su especialidad para reincorporarse). Un file
  **BLOQUEADO** no puede ingresar trámite, dictaminar ni emitir.
- El desbloqueo exige el **número de la resolución** que define la situación del estudiante y queda en la
  bitácora, con quién y cuándo. No hay bloqueo automático por UF reprobadas.

## Firma del Coordinador y emisión (RF-12, RF-13, D-11, DEC-040)

- No hay dictamen (D-11): el Coordinador solo **firma** los certificados que Kardex imprimió (paso
  `FIRMA_COORDINADOR` de la hoja de ruta, DEC-033). No los devuelve (D-37, propuesta).
- Cada impresión registra n.º de valorado y usuario; reimprimir exige motivo.
- Vista previa siempre con marca de agua "VISTA PREVIA".

## Seguridad y acceso

- Login con CI + contraseña (D-14). 5 intentos fallidos → bloqueo 15 min. Rate limit 10/min por IP.
- Access JWT 15 min + refresh rotado en cookie httpOnly/Secure/SameSite=Strict; 15 min de inactividad = cierre.
- Contraseña: bcrypt costo ≥ 12, mín. 8 caracteres con letras, números y símbolos (DEC-011). Reseteo por Kardex obliga a cambiarla.
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
