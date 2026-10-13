-- =====================================================================
-- SISET — Datos de prueba (ficticios) · ejecutar DESPUÉS de siset_schema.sql
-- Contraseña de todos los usuarios: demo123
-- =====================================================================
BEGIN;

-- Hash bcrypt (costo 12) de "demo123", verificado con bcryptjs. Se ejecuta con psql (usa \set).
\set pwd '''$2a$12$zhXgSy9Ixhy8GCyW4wj3zekF7ioFY2FXnu2RUlCJh7o08naYvNQ4S'''

-- ---------- Personas ----------
INSERT INTO persona (ci, nombres, apellido_paterno, apellido_materno, celular, email) VALUES
  ('4801122', 'María',       'Quispe',  'Mamani',   '71500001', 'kardex@esfm.test'),        -- 1 Kardex
  ('4802233', 'Rosa',        'Choque',  'Apaza',    '71500002', 'secdir@esfm.test'),        -- 2 Sec. Dirección
  ('4803344', 'Ana',         'Ticona',  'Laura',    '71500003', 'seccoord@esfm.test'),      -- 3 Sec. Coordinación
  ('4804455', 'Pedro',       'Huanca',  'Calle',    '71500004', 'coordinador@esfm.test'),   -- 4 Coordinador
  ('7012345', 'Juan Carlos', 'Mamani',  'Condori',  '71600001', NULL),                      -- 5 estudiante (amarillo)
  ('7023456', 'Elena',       'Limachi', 'Poma',     '71600002', NULL),                      -- 6 estudiante (verde)
  ('7034567', 'Wilson',      'Copa',    'Nina',     '71600003', NULL),                      -- 7 estudiante (rojo: UF)
  ('6098765', 'Lucía',       'Flores',  'Alanoca',  '71700001', NULL),                      -- 8 egresada (trámite en revisión)
  ('6087654', 'Marco',       'Callisaya','Tola',    '71700002', NULL);                      -- 9 egresado (trámite entregado)

-- ---------- Usuarios ----------
INSERT INTO usuario (persona_id, rol_id, sede_id, username, password_hash, debe_cambiar_password) VALUES
  (1, (SELECT id FROM rol WHERE codigo='KARDEX'),      (SELECT id FROM sede WHERE codigo='ANCOCAGUA'), 'kardex',      :pwd, FALSE),
  (2, (SELECT id FROM rol WHERE codigo='SEC_DIR'),     (SELECT id FROM sede WHERE codigo='LA_PAZ'),    'secdir',      :pwd, FALSE),
  (3, (SELECT id FROM rol WHERE codigo='SEC_COORD'),   (SELECT id FROM sede WHERE codigo='ANCOCAGUA'), 'seccoord',    :pwd, FALSE),
  (4, (SELECT id FROM rol WHERE codigo='COORDINADOR'), (SELECT id FROM sede WHERE codigo='ANCOCAGUA'), 'coordinador', :pwd, FALSE),
  (5, (SELECT id FROM rol WHERE codigo='ESTUDIANTE'),  NULL, '7012345', :pwd, FALSE),
  (6, (SELECT id FROM rol WHERE codigo='ESTUDIANTE'),  NULL, '7023456', :pwd, FALSE),
  (7, (SELECT id FROM rol WHERE codigo='ESTUDIANTE'),  NULL, '7034567', :pwd, FALSE),
  (8, (SELECT id FROM rol WHERE codigo='EGRESADO'),    NULL, '6098765', :pwd, FALSE),
  (9, (SELECT id FROM rol WHERE codigo='EGRESADO'),    NULL, '6087654', :pwd, FALSE);

-- ---------- Files académicos ----------
INSERT INTO file_academico (persona_id, codigo_estudiante, especialidad_id, anio_ingreso, condicion) VALUES
  (5, 'EST-2023-0041', (SELECT id FROM especialidad WHERE nombre='Matemática'),               2023, 'ESTUDIANTE'),
  (6, 'EST-2024-0102', (SELECT id FROM especialidad WHERE nombre='Comunicación y Lenguajes'), 2024, 'ESTUDIANTE'),
  (7, 'EST-2022-0077', (SELECT id FROM especialidad WHERE nombre='Educación Física y Deportes'), 2022, 'ESTUDIANTE'),
  (8, 'EST-2021-0015', (SELECT id FROM especialidad WHERE nombre='Matemática'),               2021, 'EGRESADO'),
  (9, 'EST-2020-0009', (SELECT id FROM especialidad WHERE nombre='Educación Primaria Comunitaria Vocacional'), 2020, 'EGRESADO');

-- Matrículas
INSERT INTO matricula (file_id, anio_formacion, gestion, estado)
SELECT 1, a, 2022 + a, CASE WHEN a = 4 THEN 'VIGENTE' ELSE 'CONCLUIDA' END::estado_matricula FROM generate_series(1,4) a
UNION ALL SELECT 2, a, 2023 + a, CASE WHEN a = 3 THEN 'VIGENTE' ELSE 'CONCLUIDA' END::estado_matricula FROM generate_series(1,3) a
UNION ALL SELECT 3, a, 2021 + a, CASE WHEN a = 5 THEN 'VIGENTE' ELSE 'CONCLUIDA' END::estado_matricula FROM generate_series(1,5) a
UNION ALL SELECT 4, a, 2020 + a, 'CONCLUIDA'::estado_matricula FROM generate_series(1,5) a
UNION ALL SELECT 5, a, 2019 + a, 'CONCLUIDA'::estado_matricula FROM generate_series(1,5) a;

-- Resultados anuales (Wilson reprobó 3 UF en 3.er año → ROJO)
INSERT INTO resultado_anual (file_id, anio_formacion, gestion, resultado, uf_reprobadas, fuente, registrado_por)
SELECT 1, a, 2022 + a, 'APROBADO'::resultado_gestion, CASE WHEN a = 2 THEN 1 ELSE 0 END, 'Certificado de notas', 1 FROM generate_series(1,3) a
UNION ALL SELECT 2, a, 2023 + a, 'APROBADO', 0, 'Certificado de notas', 1 FROM generate_series(1,2) a
UNION ALL SELECT 3, a, 2021 + a, CASE WHEN a = 3 THEN 'REPROBADO' ELSE 'APROBADO' END::resultado_gestion,
                 CASE WHEN a = 3 THEN 3 ELSE 0 END, 'Certificado de notas', 1 FROM generate_series(1,4) a
UNION ALL SELECT 4, a, 2020 + a, 'APROBADO', 0, 'Certificado de notas', 1 FROM generate_series(1,5) a
UNION ALL SELECT 5, a, 2019 + a, 'APROBADO', 0, 'Certificado de notas', 1 FROM generate_series(1,5) a;

-- Requisitos: todos completos excepto TACFI de Juan Carlos (→ AMARILLO)
INSERT INTO requisito_file (file_id, requisito_tipo_id, estado, fecha, nro_documento, nivel, registrado_por)
SELECT f.id, rt.id,
       CASE WHEN f.id = 1 AND rt.codigo = 'TACFI' THEN 'PENDIENTE' ELSE 'COMPLETO' END::estado_requisito,
       CASE WHEN f.id = 1 AND rt.codigo = 'TACFI' THEN NULL ELSE DATE '2026-03-15' END,
       CASE WHEN f.id = 1 AND rt.codigo = 'TACFI' THEN NULL ELSE rt.codigo || '-' || lpad(f.id::text, 4, '0') END,
       CASE WHEN rt.requiere_nivel AND NOT (f.id = 1 AND rt.codigo = 'TACFI') THEN 'INTERMEDIO'::nivel_tclo END,
       CASE WHEN f.id = 1 AND rt.codigo = 'TACFI' THEN NULL ELSE 1 END
FROM file_academico f CROSS JOIN requisito_tipo rt;

-- ---------- Trámite 1: Lucía, historial académico, EN_REVISION ----------
WITH n AS (SELECT * FROM fn_siguiente_nro_hoja_ruta(2026::SMALLINT))
INSERT INTO hoja_ruta (nro_tramite, gestion, correlativo, file_id, tipo_tramite_id, estado_actual,
                       sede_actual_id, nro_valorado, fecha_ingreso, creado_por)
SELECT n.nro, 2026, n.correlativo, 4, (SELECT id FROM tipo_tramite WHERE codigo='HISTORIAL'),
       'EN_REVISION', (SELECT id FROM sede WHERE codigo='ANCOCAGUA'), '004512', '2026-09-28 09:12-04', 2
FROM n;

INSERT INTO movimiento_hoja_ruta (hoja_ruta_id, estado_anterior, estado_nuevo, sede_id, usuario_id, observacion, fecha) VALUES
  (1, NULL,              'REGISTRADO',      1, 2, 'Valorado N.º 004512',  '2026-09-28 09:12-04'),
  (1, 'REGISTRADO',      'EN_TRANSITO_ANC', 1, 2, NULL,                   '2026-09-28 09:15-04'),
  (1, 'EN_TRANSITO_ANC', 'RECIBIDO',        2, 3, NULL,                   '2026-09-30 10:40-04'),
  (1, 'RECIBIDO',        'EN_REVISION',     2, 1, NULL,                   '2026-10-01 08:30-04');

INSERT INTO pase (hoja_ruta_id, sede_origen_id, sede_destino_id, usuario_envia_id, fecha_envio, usuario_recibe_id, fecha_recepcion) VALUES
  (1, 1, 2, 2, '2026-09-28 09:15-04', 3, '2026-09-30 10:40-04');

-- ---------- Trámite 2: Marco, ENTREGADO (ciclo completo) ----------
WITH n AS (SELECT * FROM fn_siguiente_nro_hoja_ruta(2026::SMALLINT))
INSERT INTO hoja_ruta (nro_tramite, gestion, correlativo, file_id, tipo_tramite_id, estado_actual,
                       sede_actual_id, nro_valorado, fecha_ingreso, fecha_cierre, creado_por)
SELECT n.nro, 2026, n.correlativo, 5, (SELECT id FROM tipo_tramite WHERE codigo='HISTORIAL'),
       'ENTREGADO', 1, '004390', '2026-09-01 08:40-04', '2026-09-19 11:00-04', 2
FROM n;

INSERT INTO movimiento_hoja_ruta (hoja_ruta_id, estado_anterior, estado_nuevo, sede_id, usuario_id, fecha) VALUES
  (2, NULL,              'REGISTRADO',      1, 2, '2026-09-01 08:40-04'),
  (2, 'REGISTRADO',      'EN_TRANSITO_ANC', 1, 2, '2026-09-01 08:45-04'),
  (2, 'EN_TRANSITO_ANC', 'RECIBIDO',        2, 3, '2026-09-03 09:10-04'),
  (2, 'RECIBIDO',        'EN_REVISION',     2, 1, '2026-09-04 10:00-04'),
  (2, 'EN_REVISION',     'DICTAMINADO',     2, 4, '2026-09-08 15:30-04'),
  (2, 'DICTAMINADO',     'EN_IMPRESION',    2, 1, '2026-09-09 09:00-04'),
  (2, 'EN_IMPRESION',    'EN_TRANSITO_LP',  2, 1, '2026-09-10 16:00-04'),
  (2, 'EN_TRANSITO_LP',  'EN_FIRMA',        1, 2, '2026-09-12 09:20-04'),
  (2, 'EN_FIRMA',        'LISTO',           1, 2, '2026-09-17 12:00-04'),
  (2, 'LISTO',           'ENTREGADO',       1, 2, '2026-09-19 11:00-04');

INSERT INTO pase (hoja_ruta_id, sede_origen_id, sede_destino_id, usuario_envia_id, fecha_envio, usuario_recibe_id, fecha_recepcion) VALUES
  (2, 1, 2, 2, '2026-09-01 08:45-04', 3, '2026-09-03 09:10-04'),
  (2, 2, 1, 1, '2026-09-10 16:00-04', 2, '2026-09-12 09:20-04');

INSERT INTO dictamen (hoja_ruta_id, coordinador_id, resultado, fecha) VALUES
  (2, 4, 'APROBADO', '2026-09-08 15:30-04');

INSERT INTO documento_emitido (hoja_ruta_id, tipo_documento, nro_valorado, emitido_por, fecha) VALUES
  (2, 'HISTORIAL', 'V-2026-001877', 1, '2026-09-09 09:00-04');

-- ---------- Bitácora de ejemplo ----------
INSERT INTO log_auditoria (usuario_id, accion, modulo, entidad, entidad_id, datos_antes, datos_despues, ip, fecha) VALUES
  (1, 'LOGIN',        'AUTH',       NULL,        NULL, NULL, NULL, '192.168.1.20', '2026-10-01 08:25-04'),
  (1, 'CAMBIAR_ESTADO','HOJAS_RUTA','hoja_ruta', '1',
      '{"estado_actual":"RECIBIDO"}', '{"estado_actual":"EN_REVISION"}', '192.168.1.20', '2026-10-01 08:30-04');

COMMIT;
