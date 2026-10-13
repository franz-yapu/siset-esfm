-- =====================================================================
-- SISET — Sistema de Gestión y Seguimiento de Trámites (UA Ancocagua)
-- Modelo relacional tentativo · PostgreSQL 16
-- Versión 0.1 · 13 oct 2026
--
-- Contenido:
--   0. Tipos enumerados
--   1. Seguridad        : rol, persona, usuario, refresh_token
--   2. Catálogos        : sede, especialidad, requisito_tipo, tipo_tramite,
--                         tipo_tramite_requisito, parametro
--   3. File académico   : file_academico, matricula, resultado_anual, requisito_file
--   4. Trámites         : hoja_ruta_correlativo, hoja_ruta, movimiento_hoja_ruta,
--                         pase, dictamen, documento_emitido
--   5. Auditoría        : log_auditoria
--   6. Funciones, triggers y vistas
--   7. Datos iniciales (catálogos)
--
-- Antes de ejecutar: ALTER DATABASE siset SET timezone TO 'America/La_Paz';
--
-- Convenciones: snake_case, PK "id" INTEGER IDENTITY (no BIGINT: Prisma lo devuelve como bigint y rompe el JSON), fechas TIMESTAMPTZ,
-- borrado lógico (columna "activo"), FK con ON DELETE RESTRICT.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE estado_tramite AS ENUM (
  'REGISTRADO',        -- ingresado en Sec. Dirección (La Paz)
  'EN_TRANSITO_ANC',   -- pase enviado a Ancocagua
  'RECIBIDO',          -- recibido en Ancocagua
  'EN_REVISION',       -- Kardex valida el file
  'OBSERVADO',         -- falta requisito o file bloqueado
  'DICTAMINADO',       -- Coordinador emitió dictamen aprobado
  'EN_IMPRESION',      -- Kardex emite el documento
  'EN_TRANSITO_LP',    -- pase de retorno a La Paz
  'EN_FIRMA',          -- firmas de autoridades
  'LISTO',             -- listo para entrega
  'ENTREGADO'          -- trámite cerrado
);

CREATE TYPE condicion_estudiante AS ENUM ('ESTUDIANTE', 'EGRESADO');
CREATE TYPE estado_matricula     AS ENUM ('VIGENTE', 'CONCLUIDA', 'ANULADA');
CREATE TYPE resultado_gestion    AS ENUM ('APROBADO', 'REPROBADO');
CREATE TYPE estado_requisito     AS ENUM ('PENDIENTE', 'COMPLETO', 'OBSERVADO');
CREATE TYPE nivel_tclo           AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO');
CREATE TYPE resultado_dictamen   AS ENUM ('APROBADO', 'OBSERVADO');

-- ---------------------------------------------------------------------
-- 1. SEGURIDAD
-- ---------------------------------------------------------------------
CREATE TABLE rol (
  id          SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo      VARCHAR(20)  NOT NULL UNIQUE,     -- ESTUDIANTE, EGRESADO, SEC_DIR, SEC_COORD, COORDINADOR, KARDEX
  nombre      VARCHAR(80)  NOT NULL,
  descripcion VARCHAR(255)
);
COMMENT ON TABLE rol IS 'Roles del sistema (RBAC). Catálogo fijo de 6 roles.';

CREATE TABLE sede (
  id        SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo    VARCHAR(20)  NOT NULL UNIQUE,       -- LA_PAZ, ANCOCAGUA
  nombre    VARCHAR(100) NOT NULL,
  direccion VARCHAR(200),
  activo    BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE sede IS 'Sedes físicas por donde circula el expediente.';

-- Datos personales en una sola tabla: los usa tanto el usuario (personal y
-- estudiantes) como el file académico. Evita duplicar nombre y CI (3FN).
CREATE TABLE persona (
  id               INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ci               VARCHAR(15)  NOT NULL,
  complemento      VARCHAR(5),                  -- complemento del CI (ej. "1A")
  nombres          VARCHAR(80)  NOT NULL,
  apellido_paterno VARCHAR(60),
  apellido_materno VARCHAR(60),
  fecha_nacimiento DATE,
  celular          VARCHAR(20),
  email            VARCHAR(120),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_persona_ci UNIQUE (ci, complemento),
  CONSTRAINT ck_persona_apellido CHECK (apellido_paterno IS NOT NULL OR apellido_materno IS NOT NULL)
);
COMMENT ON TABLE persona IS 'Datos personales únicos por CI.';

CREATE TABLE usuario (
  id                    INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  persona_id            INTEGER       NOT NULL UNIQUE REFERENCES persona(id) ON DELETE RESTRICT,
  rol_id                SMALLINT     NOT NULL REFERENCES rol(id) ON DELETE RESTRICT,
  sede_id               SMALLINT     REFERENCES sede(id) ON DELETE RESTRICT,  -- NULL para estudiante/egresado
  username              VARCHAR(40)  NOT NULL UNIQUE,                        -- CI o usuario institucional
  password_hash         VARCHAR(100) NOT NULL,                               -- bcrypt, costo >= 12
  activo                BOOLEAN      NOT NULL DEFAULT TRUE,                  -- baja lógica
  intentos_fallidos     SMALLINT     NOT NULL DEFAULT 0,
  bloqueado_hasta       TIMESTAMPTZ,
  debe_cambiar_password BOOLEAN      NOT NULL DEFAULT TRUE,
  ultimo_acceso         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT ck_usuario_intentos CHECK (intentos_fallidos >= 0)
);
COMMENT ON TABLE usuario IS 'Cuentas de acceso. Un usuario = una persona con un rol.';
COMMENT ON COLUMN usuario.sede_id IS 'Sede donde trabaja el personal; define qué pases puede enviar/recibir.';

CREATE TABLE refresh_token (
  id          INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  INTEGER       NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token_hash  CHAR(64)     NOT NULL UNIQUE,     -- SHA-256 del token, nunca el token en claro
  expira_en   TIMESTAMPTZ  NOT NULL,
  revocado_en TIMESTAMPTZ,
  ip          INET,
  user_agent  VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE refresh_token IS 'Sesiones activas (JWT de refresco rotativo).';

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS Y PARÁMETROS
-- ---------------------------------------------------------------------
CREATE TABLE especialidad (
  id     SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  activo BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE requisito_tipo (
  id             SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo         VARCHAR(30)  NOT NULL UNIQUE,  -- TACFI, TCLO, CERT_NOTAS...
  nombre         VARCHAR(120) NOT NULL,
  descripcion    VARCHAR(255),
  obligatorio    BOOLEAN      NOT NULL DEFAULT TRUE,  -- cuenta para el semáforo
  requiere_nivel BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE para TCLO
  activo         BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE requisito_tipo IS 'Catálogo parametrizable de requisitos (pendiente definición oficial, D-04/D-18).';

CREATE TABLE tipo_tramite (
  id                 SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo             VARCHAR(30)  NOT NULL UNIQUE,  -- HISTORIAL, COPIA_LEGALIZADA, CERTIFICACION
  nombre             VARCHAR(120) NOT NULL,
  plantilla_documento VARCHAR(50),                  -- plantilla PDF que se emite al final
  activo             BOOLEAN      NOT NULL DEFAULT TRUE
);
COMMENT ON TABLE tipo_tramite IS 'Tipos de trámite que puede iniciar un egresado (D-21).';

-- N:M — qué requisitos exige cada tipo de trámite
CREATE TABLE tipo_tramite_requisito (
  tipo_tramite_id   SMALLINT NOT NULL REFERENCES tipo_tramite(id)   ON DELETE CASCADE,
  requisito_tipo_id SMALLINT NOT NULL REFERENCES requisito_tipo(id) ON DELETE RESTRICT,
  PRIMARY KEY (tipo_tramite_id, requisito_tipo_id)
);

CREATE TABLE parametro (
  clave       VARCHAR(50)  PRIMARY KEY,
  valor       VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE parametro IS 'Reglas configurables sin tocar código (límite de UF, días de alerta, etc.).';

-- ---------------------------------------------------------------------
-- 3. FILE ACADÉMICO
-- ---------------------------------------------------------------------
CREATE TABLE file_academico (
  id                INTEGER               GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  persona_id        INTEGER               NOT NULL UNIQUE REFERENCES persona(id) ON DELETE RESTRICT,
  codigo_estudiante VARCHAR(20)          NOT NULL UNIQUE,
  especialidad_id   SMALLINT             NOT NULL REFERENCES especialidad(id) ON DELETE RESTRICT,
  anio_ingreso      SMALLINT             NOT NULL,
  condicion         condicion_estudiante NOT NULL DEFAULT 'ESTUDIANTE',
  bloqueado         BOOLEAN              NOT NULL DEFAULT FALSE,
  motivo_bloqueo    VARCHAR(255),
  activo            BOOLEAN              NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT now(),
  CONSTRAINT ck_file_anio   CHECK (anio_ingreso BETWEEN 1990 AND 2100),
  CONSTRAINT ck_file_motivo CHECK (NOT bloqueado OR motivo_bloqueo IS NOT NULL)
);
COMMENT ON TABLE file_academico IS 'Expediente del estudiante/egresado custodiado por Kardex.';

CREATE TABLE matricula (
  id             INTEGER           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_id        INTEGER           NOT NULL REFERENCES file_academico(id) ON DELETE RESTRICT,
  anio_formacion SMALLINT         NOT NULL,
  gestion        SMALLINT         NOT NULL,
  estado         estado_matricula NOT NULL DEFAULT 'VIGENTE',
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT uq_matricula_anio UNIQUE (file_id, anio_formacion),
  CONSTRAINT ck_matricula_rango CHECK (anio_formacion BETWEEN 1 AND 5)
);

CREATE TABLE resultado_anual (
  id             INTEGER            GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_id        INTEGER            NOT NULL REFERENCES file_academico(id) ON DELETE RESTRICT,
  anio_formacion SMALLINT          NOT NULL,
  gestion        SMALLINT          NOT NULL,
  resultado      resultado_gestion NOT NULL,
  uf_reprobadas  SMALLINT          NOT NULL DEFAULT 0,
  fuente         VARCHAR(100),                       -- de dónde vino el dato (D-07)
  registrado_por INTEGER            NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
  CONSTRAINT uq_resultado_anio UNIQUE (file_id, anio_formacion),
  CONSTRAINT ck_resultado_rango CHECK (anio_formacion BETWEEN 1 AND 5),
  CONSTRAINT ck_resultado_uf    CHECK (uf_reprobadas >= 0)
);
COMMENT ON TABLE resultado_anual IS 'Estado de notas por año (no se guardan notas por UF, D-07).';

CREATE TABLE requisito_file (
  id                INTEGER           GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_id           INTEGER           NOT NULL REFERENCES file_academico(id) ON DELETE RESTRICT,
  requisito_tipo_id SMALLINT         NOT NULL REFERENCES requisito_tipo(id) ON DELETE RESTRICT,
  estado            estado_requisito NOT NULL DEFAULT 'PENDIENTE',
  fecha             DATE,                         -- fecha del documento o de recepción física
  nro_documento     VARCHAR(40),
  nivel             nivel_tclo,                   -- solo para TCLO
  observacion       VARCHAR(255),
  registrado_por    INTEGER           REFERENCES usuario(id) ON DELETE RESTRICT,
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
  CONSTRAINT uq_requisito_file UNIQUE (file_id, requisito_tipo_id),
  CONSTRAINT ck_requisito_completo CHECK (estado <> 'COMPLETO' OR (fecha IS NOT NULL AND registrado_por IS NOT NULL))
);
COMMENT ON TABLE requisito_file IS 'Estado de cada requisito por file (TACFI, TCLO, certificado de notas...).';

-- ---------------------------------------------------------------------
-- 4. TRÁMITES (HOJAS DE RUTA)
-- ---------------------------------------------------------------------
-- Correlativo por gestión: se bloquea la fila con SELECT ... FOR UPDATE
-- para que dos ingresos simultáneos nunca reciban el mismo número.
CREATE TABLE hoja_ruta_correlativo (
  gestion SMALLINT PRIMARY KEY,
  ultimo  INTEGER  NOT NULL DEFAULT 0
);

CREATE TABLE hoja_ruta (
  id              INTEGER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nro_tramite     VARCHAR(20)    NOT NULL UNIQUE,  -- HR-2026-000123
  gestion         SMALLINT       NOT NULL,
  correlativo     INTEGER        NOT NULL,
  file_id         INTEGER         NOT NULL REFERENCES file_academico(id) ON DELETE RESTRICT,
  tipo_tramite_id SMALLINT       NOT NULL REFERENCES tipo_tramite(id) ON DELETE RESTRICT,
  estado_actual   estado_tramite NOT NULL DEFAULT 'REGISTRADO',
  sede_actual_id  SMALLINT       NOT NULL REFERENCES sede(id) ON DELETE RESTRICT,
  nro_valorado    VARCHAR(30),                    -- valorado canjeado al ingresar
  observacion     VARCHAR(255),
  fecha_ingreso   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  fecha_cierre    TIMESTAMPTZ,                    -- se llena al pasar a ENTREGADO
  creado_por      INTEGER         NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT uq_hoja_ruta_correlativo UNIQUE (gestion, correlativo),
  CONSTRAINT ck_hoja_ruta_cierre CHECK ((estado_actual = 'ENTREGADO') = (fecha_cierre IS NOT NULL))
);
COMMENT ON TABLE hoja_ruta IS 'Trámite del egresado. estado_actual es una copia rápida del último movimiento.';

-- Historial de estados: alimenta el timeline y los KPIs de tiempos.
CREATE TABLE movimiento_hoja_ruta (
  id              INTEGER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hoja_ruta_id    INTEGER         NOT NULL REFERENCES hoja_ruta(id) ON DELETE RESTRICT,
  estado_anterior estado_tramite,                 -- NULL en el primer movimiento
  estado_nuevo    estado_tramite NOT NULL,
  sede_id         SMALLINT       NOT NULL REFERENCES sede(id) ON DELETE RESTRICT,
  usuario_id      INTEGER         NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  observacion     VARCHAR(255),
  fecha           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT ck_movimiento_cambio CHECK (estado_anterior IS DISTINCT FROM estado_nuevo)
);
COMMENT ON TABLE movimiento_hoja_ruta IS 'Evento de dominio: cada cambio de estado del trámite (solo inserción).';

CREATE TABLE pase (
  id                INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hoja_ruta_id      INTEGER      NOT NULL REFERENCES hoja_ruta(id) ON DELETE RESTRICT,
  sede_origen_id    SMALLINT    NOT NULL REFERENCES sede(id) ON DELETE RESTRICT,
  sede_destino_id   SMALLINT    NOT NULL REFERENCES sede(id) ON DELETE RESTRICT,
  usuario_envia_id  INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  fecha_envio       TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_recibe_id INTEGER      REFERENCES usuario(id) ON DELETE RESTRICT,
  fecha_recepcion   TIMESTAMPTZ,
  observacion       VARCHAR(255),
  CONSTRAINT ck_pase_sedes     CHECK (sede_origen_id <> sede_destino_id),
  CONSTRAINT ck_pase_recepcion CHECK ((usuario_recibe_id IS NULL) = (fecha_recepcion IS NULL)),
  CONSTRAINT ck_pase_orden     CHECK (fecha_recepcion IS NULL OR fecha_recepcion >= fecha_envio)
);
COMMENT ON TABLE pase IS 'Cadena de custodia entre sedes. Pendiente = fecha_recepcion NULL.';

CREATE TABLE dictamen (
  id             INTEGER             GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hoja_ruta_id   INTEGER             NOT NULL REFERENCES hoja_ruta(id) ON DELETE RESTRICT,
  coordinador_id INTEGER             NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  resultado      resultado_dictamen NOT NULL,
  observaciones  VARCHAR(500),
  fecha          TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT ck_dictamen_obs CHECK (resultado = 'APROBADO' OR observaciones IS NOT NULL)
);
COMMENT ON TABLE dictamen IS 'Un trámite puede tener varios dictámenes (observado y luego aprobado).';

CREATE TABLE documento_emitido (
  id                 INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hoja_ruta_id       INTEGER      NOT NULL REFERENCES hoja_ruta(id) ON DELETE RESTRICT,
  tipo_documento     VARCHAR(50) NOT NULL,        -- HISTORIAL, CERT_TCLO, CONST_TACFI...
  nro_valorado       VARCHAR(30) NOT NULL,
  emitido_por        INTEGER      NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
  es_reimpresion     BOOLEAN     NOT NULL DEFAULT FALSE,
  motivo_reimpresion VARCHAR(255),
  fecha              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_documento_valorado UNIQUE (nro_valorado),
  CONSTRAINT ck_documento_motivo CHECK (NOT es_reimpresion OR motivo_reimpresion IS NOT NULL)
);
COMMENT ON TABLE documento_emitido IS 'Cada impresión oficial con su valorado (RF-12).';

-- ---------------------------------------------------------------------
-- 5. AUDITORÍA
-- ---------------------------------------------------------------------
CREATE TABLE log_auditoria (
  id            INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id    INTEGER       REFERENCES usuario(id) ON DELETE RESTRICT,  -- NULL = sistema o login fallido
  accion        VARCHAR(40)  NOT NULL,          -- LOGIN, LOGIN_FALLIDO, CREAR, EDITAR, ENVIAR_PASE...
  modulo        VARCHAR(40)  NOT NULL,          -- AUTH, USUARIOS, FILES, HOJAS_RUTA, PASES...
  entidad       VARCHAR(40),                    -- tabla afectada
  entidad_id    VARCHAR(40),                    -- id del registro afectado
  datos_antes   JSONB,
  datos_despues JSONB,
  ip            INET,
  user_agent    VARCHAR(255),
  fecha         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE log_auditoria IS 'Bitácora inmutable: un trigger impide UPDATE y DELETE (RF-14).';

-- ---------------------------------------------------------------------
-- ÍNDICES (consultas frecuentes)
-- ---------------------------------------------------------------------
CREATE INDEX ix_persona_apellidos      ON persona (apellido_paterno, apellido_materno);
CREATE INDEX ix_usuario_rol            ON usuario (rol_id) WHERE activo;
CREATE INDEX ix_refresh_usuario        ON refresh_token (usuario_id) WHERE revocado_en IS NULL;
CREATE INDEX ix_file_especialidad      ON file_academico (especialidad_id, anio_ingreso);
CREATE INDEX ix_file_bloqueado         ON file_academico (id) WHERE bloqueado;
CREATE INDEX ix_hoja_ruta_bandeja      ON hoja_ruta (sede_actual_id, estado_actual);
CREATE INDEX ix_hoja_ruta_file         ON hoja_ruta (file_id);
CREATE INDEX ix_hoja_ruta_fecha        ON hoja_ruta (fecha_ingreso DESC);
CREATE INDEX ix_movimiento_timeline    ON movimiento_hoja_ruta (hoja_ruta_id, fecha);
CREATE INDEX ix_pase_por_recibir       ON pase (sede_destino_id) WHERE fecha_recepcion IS NULL;
CREATE INDEX ix_pase_hoja_ruta         ON pase (hoja_ruta_id);
CREATE INDEX ix_dictamen_hoja_ruta     ON dictamen (hoja_ruta_id, fecha DESC);
CREATE INDEX ix_documento_hoja_ruta    ON documento_emitido (hoja_ruta_id);
CREATE INDEX ix_auditoria_fecha        ON log_auditoria (fecha DESC);
CREATE INDEX ix_auditoria_usuario      ON log_auditoria (usuario_id, fecha DESC);
CREATE INDEX ix_auditoria_modulo       ON log_auditoria (modulo, fecha DESC);

-- ---------------------------------------------------------------------
-- 6. FUNCIONES, TRIGGERS Y VISTAS
-- ---------------------------------------------------------------------

-- 6.1 updated_at automático
CREATE FUNCTION fn_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER tg_persona_updated   BEFORE UPDATE ON persona        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tg_usuario_updated   BEFORE UPDATE ON usuario        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tg_file_updated      BEFORE UPDATE ON file_academico FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tg_requisito_updated BEFORE UPDATE ON requisito_file FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tg_hoja_ruta_updated BEFORE UPDATE ON hoja_ruta      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tg_parametro_updated BEFORE UPDATE ON parametro      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- 6.2 Bitácora y movimientos inmutables (solo INSERT)
CREATE FUNCTION fn_solo_insercion() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo inserción: no se permite %', TG_TABLE_NAME, TG_OP;
END $$;

CREATE TRIGGER tg_auditoria_inmutable  BEFORE UPDATE OR DELETE ON log_auditoria
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();
CREATE TRIGGER tg_movimiento_inmutable BEFORE UPDATE OR DELETE ON movimiento_hoja_ruta
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();

-- 6.3 Siguiente número de hoja de ruta (transaccional y sin duplicados)
CREATE FUNCTION fn_siguiente_nro_hoja_ruta(p_gestion SMALLINT,
                                           OUT nro TEXT, OUT correlativo INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO hoja_ruta_correlativo (gestion, ultimo) VALUES (p_gestion, 0)
  ON CONFLICT (gestion) DO NOTHING;

  UPDATE hoja_ruta_correlativo
     SET ultimo = ultimo + 1
   WHERE gestion = p_gestion
  RETURNING ultimo INTO correlativo;          -- UPDATE bloquea la fila hasta el COMMIT

  nro := format('HR-%s-%s', p_gestion, lpad(correlativo::TEXT, 6, '0'));
END $$;

-- 6.4 Semáforo del file (RF-07)
CREATE VIEW v_file_semaforo AS
SELECT
  f.id AS file_id,
  CASE
    WHEN f.bloqueado
      OR EXISTS (SELECT 1 FROM resultado_anual r
                  WHERE r.file_id = f.id
                    AND r.uf_reprobadas > (SELECT valor::INT FROM parametro WHERE clave = 'MAX_UF_REPROBADAS'))
      THEN 'ROJO'
    WHEN EXISTS (SELECT 1 FROM requisito_tipo rt
                  WHERE rt.obligatorio AND rt.activo
                    AND NOT EXISTS (SELECT 1 FROM requisito_file rf
                                     WHERE rf.file_id = f.id
                                       AND rf.requisito_tipo_id = rt.id
                                       AND rf.estado = 'COMPLETO'))
      THEN 'AMARILLO'
    ELSE 'VERDE'
  END AS semaforo
FROM file_academico f
WHERE f.activo;
COMMENT ON VIEW v_file_semaforo IS 'ROJO: bloqueado o UF reprobadas sobre el límite. AMARILLO: requisito obligatorio pendiente. VERDE: completo.';

-- 6.5 Bandeja de trámites con días transcurridos (dashboards y alertas)
CREATE VIEW v_hoja_ruta_bandeja AS
SELECT
  h.id, h.nro_tramite, h.estado_actual, h.sede_actual_id,
  tt.nombre                                   AS tipo_tramite,
  p.ci, concat_ws(' ', p.nombres, p.apellido_paterno, p.apellido_materno) AS titular,
  h.fecha_ingreso,
  ult.fecha                                   AS fecha_ultimo_movimiento,
  (current_date - ult.fecha::date)            AS dias_sin_movimiento
FROM hoja_ruta h
JOIN file_academico f ON f.id = h.file_id
JOIN persona p        ON p.id = f.persona_id
JOIN tipo_tramite tt  ON tt.id = h.tipo_tramite_id
JOIN LATERAL (SELECT m.fecha FROM movimiento_hoja_ruta m
               WHERE m.hoja_ruta_id = h.id
               ORDER BY m.fecha DESC LIMIT 1) ult ON TRUE;

-- ---------------------------------------------------------------------
-- 7. DATOS INICIALES (catálogos)
-- ---------------------------------------------------------------------
INSERT INTO rol (codigo, nombre) VALUES
  ('ESTUDIANTE',  'Estudiante en formación'),
  ('EGRESADO',    'Maestro egresado'),
  ('SEC_DIR',     'Secretaría de Dirección General'),
  ('SEC_COORD',   'Secretaría de Coordinación'),
  ('COORDINADOR', 'Coordinador Académico'),
  ('KARDEX',      'Responsable de Archivo Kardex');

INSERT INTO sede (codigo, nombre) VALUES
  ('LA_PAZ',    'Sede Central La Paz'),
  ('ANCOCAGUA', 'UA Ancocagua (Pucarani)');

INSERT INTO especialidad (nombre) VALUES
  ('Educación Primaria Comunitaria Vocacional'),
  ('Matemática'),
  ('Comunicación y Lenguajes'),
  ('Ciencias Naturales: Biología-Geografía'),
  ('Educación Física y Deportes');

INSERT INTO requisito_tipo (codigo, nombre, obligatorio, requiere_nivel) VALUES
  ('CERT_NOTAS', 'Certificado de notas',                    TRUE, FALSE),
  ('TACFI',      'TACFI (definición pendiente, D-04)',      TRUE, FALSE),
  ('TCLO',       'TCLO — nivel de lengua originaria (D-04)', TRUE, TRUE);

INSERT INTO tipo_tramite (codigo, nombre, plantilla_documento) VALUES
  ('HISTORIAL',        'Historial académico', 'HISTORIAL'),
  ('COPIA_LEGALIZADA', 'Copia legalizada',    'COPIA_LEGALIZADA'),
  ('CERTIFICACION',    'Certificación',       'CERTIFICACION');

INSERT INTO tipo_tramite_requisito (tipo_tramite_id, requisito_tipo_id)
SELECT tt.id, rt.id FROM tipo_tramite tt CROSS JOIN requisito_tipo rt;  -- tentativo: todos exigen todo

INSERT INTO parametro (clave, valor, descripcion) VALUES
  ('MAX_UF_REPROBADAS',  '2',  'Más de este número de UF reprobadas en un año bloquea el file (D-07)'),
  ('DIAS_ALERTA_TRAMITE','10', 'Días sin movimiento para marcar un trámite como detenido'),
  ('MAX_INTENTOS_LOGIN', '5',  'Intentos fallidos antes de bloquear la cuenta'),
  ('MIN_BLOQUEO_LOGIN',  '15', 'Minutos de bloqueo tras superar los intentos');

COMMIT;
