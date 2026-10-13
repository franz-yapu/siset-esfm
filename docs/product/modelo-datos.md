# Modelo de datos — SISET v1 (adoptado)

**Estado:** adoptado por DEC-006 (2026-10-13) · **Origen:** `docs/bd-tentaiva/` (modelo tentativo v0.1)
con las correcciones de `docs/bd-tentaiva/ANALISIS.md`.

Este documento es el **modelo objetivo**: cada tabla se crea con una migración de Prisma en el ticket de
su módulo (columna "Ticket"). `docs/bd-tentaiva/siset_schema.sql` queda como referencia histórica;
cuando no coincida con este documento, gana este documento.

## Convenciones (enmiendan business-rules §Convenciones de datos, DEC-006)

| Regla                        | Valor                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clave primaria               | `id INTEGER` autoincremental (`Int @id @default(autoincrement())` en Prisma, que genera `SERIAL`). **No** `BIGINT` (Prisma lo devuelve como `bigint` y rompe `JSON.stringify`) ni `IDENTITY` (Prisma detectaría drift).                                |
| Nombres                      | Tablas y columnas en `snake_case` español; modelos de Prisma en `PascalCase` y campos en `camelCase` con `@@map`/`@map`.                                                                                                                               |
| Fechas                       | `TIMESTAMPTZ`, base en zona `America/La_Paz`. `DATE` solo para fechas sin hora (nacimiento, documento).                                                                                                                                                |
| Auditoría de filas           | `created_at` / `updated_at` en tablas operativas (Prisma `@updatedAt`).                                                                                                                                                                                |
| FK                           | `ON DELETE RESTRICT ON UPDATE RESTRICT`, explícito. **Excepciones documentadas:** `refresh_token.usuario_id` y `tipo_tramite_requisito.tipo_tramite_id` en `CASCADE` (los usuarios nunca se borran físicamente; la relación N:M no tiene vida propia). |
| Borrado                      | Lógico (`activo`). Nunca `DELETE` desde la app sobre datos de negocio.                                                                                                                                                                                 |
| Reglas que Prisma no expresa | `CHECK`, índices parciales, triggers y funciones se escriben como SQL dentro de la migración (`migrate dev --create-only` + editar), con un comentario que remite a este documento.                                                                    |
| Esquema                      | Un archivo `.prisma` por módulo dueño (ADR-0001).                                                                                                                                                                                                      |

## Tablas por módulo

### `personas` (módulo nuevo, enmienda de ADR-0001)

| Tabla     | Columnas clave                                                                                                                                     | Restricciones                                                                                                                                 | Ticket |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `persona` | `ci`, `complemento` (`NOT NULL DEFAULT ''`), `nombres`, `apellido_paterno`, `apellido_materno`, `fecha_nacimiento`, `celular`, `email`, timestamps | `UNIQUE (ci, complemento)`: con `complemento` NOT NULL no se puede duplicar un CI sin complemento (corrige E1). `CHECK` al menos un apellido. | S0.11  |

### `seguridad`

| Tabla           | Columnas clave                                                                                                                                                                                                                                                                                                            | Restricciones                                | Ticket |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| `rol`           | `codigo`, `nombre` (el del prototipo), `descripcion` (nombre largo institucional)                                                                                                                                                                                                                                         | `codigo` único                               | S0.11  |
| `usuario`       | `persona_id` (único), `rol_id`, `sede_id` (NULL para estudiante/egresado, D-24), `username` (= CI con complemento; los alias tipo "kardex" solo en el seed de desarrollo, D-25), `password_hash`, `activo`, `intentos_fallidos`, `bloqueado_hasta`, `debe_cambiar_password` (default `true`), `ultimo_acceso`, timestamps | `CHECK intentos_fallidos >= 0`               | S0.11  |
| `refresh_token` | `usuario_id`, `token_hash` (SHA-256), `expira_en`, `revocado_en`, `ip INET`, `user_agent`                                                                                                                                                                                                                                 | `token_hash` único; FK `CASCADE` (excepción) | S1.1   |

Los permisos **no** están en la base: van en el archivo de política de Casbin (ADR-0002).

### `catalogos`

| Tabla                    | Columnas clave                                                                                                              | Ticket      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `sede`                   | `codigo` (LA_PAZ, ANCOCAGUA), `nombre`, `direccion`, `activo`                                                               | S0.11       |
| `especialidad`           | `nombre` (único), `activo`                                                                                                  | S0.11       |
| `requisito_tipo`         | `codigo` (TACFI, TCLO, CERT_NOTAS…), `nombre`, `obligatorio`, `requiere_nivel`, `activo`                                    | S2.1        |
| `tipo_tramite`           | `codigo`, `nombre`, `plantilla_documento`, `activo`                                                                         | S2.1 / S3.x |
| `tipo_tramite_requisito` | PK (`tipo_tramite_id`, `requisito_tipo_id`)                                                                                 | S2.1 / S3.x |
| `parametro`              | `clave` (PK), `valor`, `descripcion`: `MAX_UF_REPROBADAS`, `DIAS_ALERTA_TRAMITE`, `MAX_INTENTOS_LOGIN`, `MIN_BLOQUEO_LOGIN` | S1.1 / S2.1 |

### `files`

| Tabla             | Columnas clave                                                                                                                                                   | Restricciones                                                                          | Ticket |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| `file_academico`  | `persona_id` (único), `codigo_estudiante` (único), `especialidad_id`, `anio_ingreso`, `condicion` (ESTUDIANTE/EGRESADO), `bloqueado`, `motivo_bloqueo`, `activo` | `CHECK` motivo si está bloqueado                                                       | S2.1   |
| `matricula`       | `file_id`, `anio_formacion` (1–5), `gestion`, `estado`                                                                                                           | `UNIQUE (file_id, anio_formacion, gestion)`: permite repetir un año (corrige E3, D-07) | S2.1   |
| `resultado_anual` | `file_id`, `anio_formacion`, `gestion`, `resultado`, `uf_reprobadas`, `fuente`, `registrado_por`                                                                 | `UNIQUE (file_id, anio_formacion, gestion)` (E3)                                       | S2.1   |
| `requisito_file`  | `file_id`, `requisito_tipo_id`, `estado` (PENDIENTE/COMPLETO/OBSERVADO), `fecha`, `nro_documento`, `nivel` (TCLO), `observacion`, `registrado_por`               | `UNIQUE (file_id, requisito_tipo_id)`; `CHECK` completo ⇒ fecha y responsable          | S2.1   |

**Semáforo y bloqueo por UF:** la regla vive en el **servicio de `files`**, probada con Vitest (motor
`do-not-touch`, RNF-07). No se crea la vista `v_file_semaforo`, para no tener la regla en dos lugares.

### `hojas-ruta`

| Tabla / objeto                                   | Columnas clave                                                                                                                                                                                                                                                                                               | Restricciones                                                                                                                                | Ticket |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `hoja_ruta_correlativo`                          | `gestion` (PK), `ultimo`                                                                                                                                                                                                                                                                                     | —                                                                                                                                            | S3.x   |
| `fn_siguiente_nro_hoja_ruta(gestion)`            | Devuelve `HR-AAAA-NNNNNN`, bloqueando la fila con `UPDATE`                                                                                                                                                                                                                                                   | —                                                                                                                                            | S3.x   |
| `hoja_ruta`                                      | `nro_tramite` (único), `gestion`, `correlativo`, `file_id`, `tipo_tramite_id`, `estado_actual`, `sede_actual_id`, `nro_valorado`, `observacion`, `fecha_ingreso`, `fecha_cierre`, **`enviado_dictamen_en`** (DEC-001 #1), **`entregado_a`** (TITULAR/APODERADO), **`ci_receptor`**, `creado_por`, timestamps | `UNIQUE (gestion, correlativo)`; `CHECK` ENTREGADO ⇔ `fecha_cierre` y datos de entrega                                                       | S3.x   |
| `movimiento_hoja_ruta`                           | `hoja_ruta_id`, `estado_anterior`, `estado_nuevo`, `sede_id`, `usuario_id`, `observacion`, `fecha`                                                                                                                                                                                                           | Solo inserción (trigger que bloquea `UPDATE`/`DELETE`/`TRUNCATE`); `CHECK` anterior ≠ nuevo                                                  | S3.x   |
| Trigger `AFTER INSERT` en `movimiento_hoja_ruta` | Copia `estado_nuevo` y `sede_id` a `hoja_ruta.estado_actual` / `sede_actual_id`                                                                                                                                                                                                                              | Corrige E5: el estado actual sale siempre del historial. La validación de transiciones es del servicio (máquina de estados, `do-not-touch`). | S3.x   |

Enum `estado_tramite`: los 11 valores del prototipo. Se crea en S3.x, después de cerrar o validar D-05.

### `pases`

| Tabla  | Columnas clave                                                                                                                                | Restricciones                                                                                                                                                                    | Ticket |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pase` | `hoja_ruta_id`, `sede_origen_id`, `sede_destino_id`, `usuario_envia_id`, `fecha_envio`, `usuario_recibe_id`, `fecha_recepcion`, `observacion` | `CHECK` sedes distintas, recepción completa y en orden; **índice único parcial `(hoja_ruta_id) WHERE fecha_recepcion IS NULL`**: un solo pase pendiente por trámite (corrige E4) | S4.x   |

### `dictamenes` y `documentos`

| Tabla               | Columnas clave                                                                                                           | Restricciones                     | Ticket |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------ |
| `dictamen`          | `hoja_ruta_id`, `coordinador_id`, `resultado` (APROBADO/OBSERVADO), `observaciones`, `fecha`                             | `CHECK` observado ⇒ observaciones | S4.7   |
| `documento_emitido` | `hoja_ruta_id`, `tipo_documento`, `nro_valorado` (único), `emitido_por`, `es_reimpresion`, `motivo_reimpresion`, `fecha` | `CHECK` reimpresión ⇒ motivo      | S5.x   |

### `auditoria`

| Tabla           | Columnas clave                                                                                                                                                                                                                                                             | Restricciones                                                                                                                                                                           | Ticket                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `log_auditoria` | `usuario_id` (**nullable**: eventos sin usuario, como un login con un CI inexistente; si D-26 dice "no", la app simplemente no los registra), `accion`, `modulo`, `entidad`, `entidad_id` (texto), `datos_antes`/`datos_despues` (JSONB), `ip INET`, `user_agent`, `fecha` | Solo inserción: trigger para `UPDATE`/`DELETE` **y `TRUNCATE`** (corrige E2) desde S0.11; `REVOKE UPDATE, DELETE, TRUNCATE` al rol de la app en S6.4 (business-rules: "permisos de BD") | S0.11 (tabla y triggers) / S6.4 (permisos) |

### `reportes` (solo lectura)

`v_hoja_ruta_bandeja` con **`LEFT JOIN LATERAL`** (un trámite sin movimientos no desaparece) → S6.x.

## Datos de prueba

- La contraseña de los usuarios de prueba debe cumplir la regla (mínimo 8 caracteres, con letras, números y símbolos; DEC-011). `demo123` no la cumple.
- Los nombres de rol son los del prototipo (el test de S0.6 lo exige); el nombre institucional largo va en `rol.descripcion`.
