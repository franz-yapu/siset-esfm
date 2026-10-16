# Modelo de datos — SISET v1 (adoptado)

**Estado:** adoptado por DEC-006 (2026-10-13) · **Origen:** `docs/bd-tentaiva/` (modelo tentativo v0.1)
con las correcciones de `docs/bd-tentaiva/ANALISIS.md`.

Este documento es el **modelo objetivo**: cada tabla se crea con una migración de Prisma en el ticket de
su módulo (columna "Ticket"). `docs/bd-tentaiva/siset_schema.sql` queda como referencia histórica;
cuando no coincida con este documento, gana este documento.

## Convenciones (enmiendan business-rules §Convenciones de datos, DEC-006)

| Regla                        | Valor                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clave primaria               | `id INTEGER` autoincremental (`Int @id @default(autoincrement())` en Prisma, que genera `SERIAL`). **No** `BIGINT` (Prisma lo devuelve como `bigint` y rompe `JSON.stringify`) ni `IDENTITY` (Prisma detectaría drift).                                                                                                                                               |
| Nombres                      | Tablas y columnas en `snake_case` español; modelos de Prisma en `PascalCase` y campos en `camelCase` con `@@map`/`@map`.                                                                                                                                                                                                                                              |
| Fechas                       | `TIMESTAMPTZ`, base en zona `America/La_Paz`. `DATE` solo para fechas sin hora (nacimiento, documento).                                                                                                                                                                                                                                                               |
| Auditoría de filas           | `created_at` / `updated_at` en tablas operativas (Prisma `@updatedAt`).                                                                                                                                                                                                                                                                                               |
| FK                           | `ON DELETE RESTRICT ON UPDATE RESTRICT`, explícito. **Excepciones documentadas:** `refresh_token.usuario_id` y `tipo_tramite_requisito.tipo_tramite_id` en `CASCADE` (los usuarios nunca se borran físicamente; la relación N:M no tiene vida propia); `refresh_token.reemplazado_por_id` en `SET NULL` (cadena de rotación entre tokens del mismo usuario, DEC-026). |
| Borrado                      | Lógico (`activo`). Nunca `DELETE` desde la app sobre datos de negocio.                                                                                                                                                                                                                                                                                                |
| Reglas que Prisma no expresa | `CHECK`, índices parciales, triggers y funciones se escriben como SQL dentro de la migración (`migrate dev --create-only` + editar), con un comentario que remite a este documento.                                                                                                                                                                                   |
| Esquema                      | Un archivo `.prisma` por módulo dueño (ADR-0001).                                                                                                                                                                                                                                                                                                                     |

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
| `refresh_token` | `usuario_id`, `token_hash` (SHA-256), `expira_en`, `revocado_en`, `reemplazado_por_id` (S1.15), `ip INET`, `user_agent`                                                                                                                                                                                                   | `token_hash` único; FK `CASCADE` (excepción) | S1.1   |

Los permisos **no** están en la base: van en el archivo de política de Casbin (ADR-0002).

### `catalogos`

| Tabla                    | Columnas clave                                                                                                                                                                                                                                                                                         | Ticket         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `sede`                   | `codigo` (LA_PAZ, ANCOCAGUA), `nombre`, `direccion`, `activo`                                                                                                                                                                                                                                          | S0.11          |
| `especialidad`           | `nombre` (único), `activo`                                                                                                                                                                                                                                                                             | S0.11          |
| `requisito_tipo`         | `codigo` (ADMISION, MATRICULA, TACFI_1…), `nombre`, `descripcion`, `orden` (N.º en el folder personal), `anio_formacion` (1–5, nullable), `nivel` (sin uso desde DEC-051), `obligatorio`, `por_gestion`, `pide_curso`, `solo_genero`, `solo_modalidad`, `activo`: los 24 del folder personal (DEC-051) | S2.1 / DEC-051 |
| `tipo_tramite`           | `codigo`, `nombre`, `requiere_valorado`, `activo`: los 4 tipos de D-21, sembrados en la migración (S3.1, DEC-034; `plantilla_documento` llega con S5.x)                                                                                                                                                | S3.1           |
| `tipo_tramite_requisito` | PK (`tipo_tramite_id`, `requisito_tipo_id`)                                                                                                                                                                                                                                                            | S2.1 / S3.x    |
| `parametro`              | `clave` (PK), `valor`, `descripcion`: `MAX_UF_REPROBADAS`, `DIAS_ALERTA_TRAMITE`, `MAX_INTENTOS_LOGIN`, `MIN_BLOQUEO_LOGIN`, `SEG_GRACIA_REFRESH`                                                                                                                                                      | S1.1 / S2.1    |

### `files`

| Tabla             | Columnas clave                                                                                                                                                                                                        | Restricciones                                                                                                 | Ticket         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------- |
| `file_academico`  | `persona_id` (único), `codigo_estudiante` (único), `especialidad_id`, `anio_ingreso`, `condicion` (ESTUDIANTE/EGRESADO), `genero`, `modalidad`, `anio_formacion` (DEC-051), `bloqueado`, `motivo_bloqueo`, `activo`   | `CHECK` motivo si está bloqueado; año de formación 1–5; modalidad en mayúsculas                               | S2.1           |
| `matricula`       | `file_id`, `anio_formacion` (1–5), `gestion`, `estado`                                                                                                                                                                | `UNIQUE (file_id, anio_formacion, gestion)`: permite repetir un año (corrige E3, D-07)                        | S2.1           |
| `resultado_anual` | `file_id`, `anio_formacion`, `gestion`, `resultado`, `uf_reprobadas`, `fuente`, `registrado_por`                                                                                                                      | `UNIQUE (file_id, anio_formacion, gestion)` (E3)                                                              | S2.1           |
| `requisito_file`  | `file_id`, `requisito_tipo_id`, `gestion` ('' o I/2025, II/2025, 2023), `estado` (PENDIENTE/COMPLETO/OBSERVADO), `fecha`, `nro_documento`, `observacion`, `nombre_curso`, `entidad_emisora` (TACFI), `registrado_por` | `UNIQUE (file_id, requisito_tipo_id, gestion)`; `CHECK` completo ⇒ fecha y responsable; formato de la gestión | S2.1 / DEC-051 |
| `bloqueo_file`    | `file_id`, `causa` (LICENCIA_OBLIGATORIA/LICENCIA_VOLUNTARIA), `nro_resolucion`, `fecha_resolucion`, `glosa`, `pdf` (bytea), `pdf_nombre`, `bloqueado_por`, `bloqueado_en`, `desbloqueado_por`, `desbloqueado_en`     | Índice único parcial: un bloqueo abierto por file; `CHECK` PDF de 1 B a 5 MB                                  | DEC-049        |

**Semáforo y bloqueo por UF:** la regla vive en el **servicio de `files`**, probada con Vitest (motor
`do-not-touch`, RNF-07; qué requisitos entran y cuándo uno está atrasado, ADR-0007). No se crea la vista `v_file_semaforo`, para no tener la regla en dos lugares.

### `hojas-ruta`

| Tabla / objeto                                   | Columnas clave                                                                                                                                                                                                       | Restricciones                                                                                                                                | Ticket |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `hoja_ruta_correlativo`                          | `gestion` (PK), `ultimo`                                                                                                                                                                                             | —                                                                                                                                            | S3.x   |
| `fn_siguiente_nro_hoja_ruta(gestion)`            | Devuelve `HR-AAAA-NNNNNN`, bloqueando la fila con `UPDATE`                                                                                                                                                           | —                                                                                                                                            | S3.x   |
| `hoja_ruta`                                      | `nro_tramite` (único), `gestion`, `file_id`, `tipo_tramite_id`, `estado_actual`, `sede_actual_id`, `nro_valorado`, `fecha_ingreso`, `fecha_cierre` (S3.1, DEC-034; sin `enviado_dictamen_en`: no hay dictamen, D-11) |
| `movimiento_hoja_ruta`                           | `hoja_ruta_id`, `accion`, `estado_anterior`, `estado_nuevo`, `sede_id`, `usuario_id`, `observacion`, `fecha` (solo inserción, ADR-0003/0005)                                                                         |
| Trigger `AFTER INSERT` en `movimiento_hoja_ruta` | Copia `estado_nuevo` y `sede_id` a `hoja_ruta.estado_actual` / `sede_actual_id`                                                                                                                                      | Corrige E5: el estado actual sale siempre del historial. La validación de transiciones es del servicio (máquina de estados, `do-not-touch`). | S3.x   |

Enum `estado_hoja_ruta`: los 9 estados de los dos flujos (DEC-033, DEC-034). Creado en S3.1.

### `pases`

No se crea por ahora: el papel lo lleva Kardex en persona (D-05). Depende de D-35 (DEC-033 #3).

### `documentos`

No hay tabla `dictamen`: el Coordinador solo firma (D-11), y eso es un paso de la hoja de ruta (DEC-033).

| Tabla               | Columnas clave                                                                                                           | Restricciones                | Ticket |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------ |
| `documento_emitido` | `hoja_ruta_id`, `tipo_documento`, `nro_valorado` (único), `emitido_por`, `es_reimpresion`, `motivo_reimpresion`, `fecha` | `CHECK` reimpresión ⇒ motivo | S5.x   |

### `auditoria`

| Tabla           | Columnas clave                                                                                                                                                                                                                                                             | Restricciones                                                                                                                                                                           | Ticket                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `log_auditoria` | `usuario_id` (**nullable**: eventos sin usuario, como un login con un CI inexistente; si D-26 dice "no", la app simplemente no los registra), `accion`, `modulo`, `entidad`, `entidad_id` (texto), `datos_antes`/`datos_despues` (JSONB), `ip INET`, `user_agent`, `fecha` | Solo inserción: trigger para `UPDATE`/`DELETE` **y `TRUNCATE`** (corrige E2) desde S0.11; `REVOKE UPDATE, DELETE, TRUNCATE` al rol de la app en S6.4 (business-rules: "permisos de BD") | S0.11 (tabla y triggers) / S6.4 (permisos) |

### `reportes` (solo lectura)

`v_hoja_ruta_bandeja` con **`LEFT JOIN LATERAL`** (un trámite sin movimientos no desaparece) → S6.x.

## Datos de prueba

- La contraseña de los usuarios de prueba debe cumplir la regla (mínimo 8 caracteres, con letras, números y símbolos; DEC-011). `demo123` no la cumple.
- Los nombres de rol son los del prototipo (el test de S0.6 lo exige); el nombre institucional largo va en `rol.descripcion`.
