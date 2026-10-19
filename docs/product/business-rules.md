# Reglas de negocio — SISET

Reglas finas que el código debe respetar. Fuente: PRD §2–§5. Las marcadas con
D-xx son provisionales hasta que el Registro de Dudas las cierre.

## Hoja de ruta — máquina de estados (DEC-033, DEC-034, ADR-0005)

Tres flujos según el tipo de trámite (D-05) y dónde se recibió (D-32b, ADR-0011). La tabla completa vive en
`apps/api/src/modulos/hojas-ruta/maquina.ts`.

- **Con valorado** (historial académico, legalización de historial):
  `RECIBIDO → AVISADO_KARDEX → EN_IMPRESION → IMPRESO → FIRMADO_DIR_ACADEMICA → LISTO → ENTREGADO`.
- **Sin valorado** (certificados de notas y de excelencia de años pasados):
  `RECIBIDO → AVISADO_KARDEX → EN_IMPRESION → IMPRESO → FIRMADO_COORDINADOR → REMITIDO_CALAHUMANA → LISTO → ENTREGADO`.
- **Sin valorado recibido en Ancocagua** (los mismos certificados, pedidos a Secretaría de Coordinación; D-32b):
  `RECIBIDO → AVISADO_KARDEX → EN_IMPRESION → IMPRESO → FIRMADO_COORDINADOR → ENTREGADO`. No pasa por Calahumana.

| Paso (acción)                                         | Rol         | Sede      | Flujo                           |
| ----------------------------------------------------- | ----------- | --------- | ------------------------------- |
| Ingesta → Recibido (S3.4)                             | SEC_DIR     | LA_PAZ    | con valorado y sin valorado     |
| Ingesta → Recibido (D-32b)                            | SEC_COORD   | ANCOCAGUA | sin valorado en Ancocagua       |
| Avisar a Kardex                                       | SEC_DIR     | LA_PAZ    | con valorado y sin valorado     |
| Derivar a Kardex (D-32b)                              | SEC_COORD   | ANCOCAGUA | sin valorado en Ancocagua       |
| Recoger (Kardex retira el valorado o el pedido)       | KARDEX      | ANCOCAGUA | los tres                        |
| Imprimir                                              | KARDEX      | ANCOCAGUA | los tres                        |
| Firma de Dirección Académica (la anota SEC_DIR, D-33) | SEC_DIR     | LA_PAZ    | con valorado                    |
| Firma de Dirección General → Listo                    | SEC_DIR     | LA_PAZ    | con valorado                    |
| Firma del Coordinador (D-11)                          | COORDINADOR | ANCOCAGUA | sin valorado (las dos sedes)    |
| Remitir a Calahumana                                  | KARDEX      | ANCOCAGUA | sin valorado                    |
| Recibir en Calahumana → Listo                         | SEC_DIR     | LA_PAZ    | sin valorado                    |
| Entregar (desde Listo)                                | SEC_DIR     | LA_PAZ    | con valorado y sin valorado     |
| Entregar (desde Firmado por el Coordinador, D-32b)    | SEC_COORD   | ANCOCAGUA | sin valorado en Ancocagua       |
| Devolver con observación → Devuelto (D-48, D-48b)     | KARDEX      | ANCOCAGUA | con valorado, solo el historial |

- Paso que el estado o el flujo no admiten → **409** `TRANSICION_INVALIDA`; otro rol u otra sede → **403**.
- Un file **bloqueado** (DEC-029) impide los pasos hasta imprimir → **422** `FILE_BLOQUEADO`.
- Cada paso inserta un `movimiento_hoja_ruta` (solo inserción) y un evento `CAMBIAR_ESTADO` en la misma transacción;
  un trigger copia el estado y la sede a la hoja. Se usa `SELECT … FOR UPDATE`.
- No hay dictamen (D-11).
- **Devolución (DEC-053, ADR-0008):** en "En impresión", Kardex contrasta las notas del historial con los empastes.
  - Si están bien, imprime: el paso guarda "Impreso en el valorado N.º …".
  - Si no, **devuelve con una observación obligatoria** (sin ella, 400). `DEVUELTO` es final: pone la fecha de cierre
    y no admite más pasos. El trámite que sigue queda fuera de SISET.
  - Un file bloqueado no impide devolver.

## Correlativo

- `HR-AAAA-NNNNNN`, único por gestión (año en La Paz), generado en la base dentro de la transacción de la ingesta
  con `fn_siguiente_nro_hoja_ruta`: sin huecos ni repetidos (ADR-0006, DEC-035).

## Ingesta (RF-08, DEC-035)

- La registra **SEC_DIR desde Calahumana** (sede LA_PAZ), cualquier tipo; o **SEC_COORD desde Ancocagua**, solo los
  certificados sin valorado (D-32b, ADR-0011). La sede de ingreso queda en `hoja_ruta.sede_ingreso_id` y no cambia.
- **N.º de valorado** obligatorio solo si el tipo lo requiere (historial y legalización); los certificados no lo
  llevan (D-05).
- El file debe existir, ser de un **egresado** (provisional, D-09) y **no estar bloqueado** (DEC-029).
- Deja el trámite en `RECIBIDO`, con su primer movimiento (`REGISTRAR`) y el evento `CREAR`.

## File académico, semáforo y bloqueo (RF-07, D-04, D-07, D-18)

- **Requisitos (DEC-051):** los 24 de la hoja "Documentación existente en folder personal" de Kardex, en su orden,
  en el catálogo `requisito_tipo`. Algunos dependen del file: la libreta militar solo a varones; el certificado de
  pueblo indígena (modalidad B1), las calificaciones de secundaria (solo B1, obligatorio; D-45b) y el carnet de
  discapacidad (modalidad B3). Las modalidades son un catálogo que administra Kardex (DEC-058): arranca con **A, B1, B2 y B3**, se comparan
  exactas (D-45) y dar de baja una no la quita de los files que la tienen. Kardex edita a qué modalidades se pide
  cada requisito, agrega y da de baja requisitos (DEC-055). Los "si corresponde" (licencia temporal,
  reincorporación, historial provisional, resolución académica) no son obligatorios. Solo **Kardex** carga los files
  y marca los requisitos (D-13b); un estudiante se registra con su modalidad.
- **TCLOA (D-46):** el boletín y el certificado, más las **3 defensas** (básico en 1.º, intermedio en 2.º, avanzado
  en 3.º; D-04b).
- La **matrícula** y el **certificado de notas** se registran **una vez por gestión** (I/2025, II/2025 o 2023): son
  requisito para la defensa del diseño metodológico en 4.º y 5.º (D-30b, D-39). Importa el documento físico en el
  file, no las notas. Se exigen **todas** las gestiones (D-47): una matrícula por cada año cursado y un certificado
  por cada año terminado (provisional hasta D-47b).
- Los **TACFI** (Artístico I en 1.º, Artístico II en 2.º, Tecnológico I en 3.º, Tecnológico II en 4.º, D-31)
  piden la fecha en que lo tomó, el nombre del curso y la entidad emisora.
- El file guarda **género, modalidad y año de formación** (cabecera del folder personal).
- **Semáforo (DEC-031, ADR-0007):** cuentan los requisitos obligatorios que aplican al file. Rojo: file bloqueado,
  algún requisito OBSERVADO o **algún requisito atrasado** (de un año que el estudiante ya pasó y sin completar,
  D-31). Amarillo: algún pendiente. Verde: todos completos. Un requisito por gestión resume sus gestiones.
- Notas: Kardex **no registra notas**; las cargan los docentes en un sistema del Ministerio (D-07). Reprobar no
  obliga a repetir TACFI ni TCLO (D-07b).
- **Bloqueo (D-29, DEC-049; antes DEC-029):** Kardex bloquea el file solo por **licencia temporal obligatoria**
  (el permiso obligatorio por una gestión, D-07b) o **licencia temporal voluntaria**: en ambas se espera que el
  estudiante se reincorpore. **Al bloquear** se anotan el número y la fecha de la resolución (no futura), una
  glosa con el motivo (queda como motivo del file) y el **PDF de la resolución** (hasta 5 MB). Un file
  **BLOQUEADO** no puede ingresar trámite, dictaminar ni emitir.
- El desbloqueo no pide datos: quedan quién y cuándo, en el bloqueo y en la bitácora. Cada bloqueo queda en el
  historial del file (`bloqueo_file`). No hay bloqueo automático por UF reprobadas.

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
