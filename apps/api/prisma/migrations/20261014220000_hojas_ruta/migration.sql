-- S3.1-S3.3 (DEC-033, DEC-034, ADR-0005): tipos de trámite, hojas de ruta y movimientos.

-- CreateEnum
CREATE TYPE "estado_hoja_ruta" AS ENUM ('RECIBIDO', 'AVISADO_KARDEX', 'EN_IMPRESION', 'IMPRESO', 'FIRMADO_DIR_ACADEMICA', 'FIRMADO_COORDINADOR', 'REMITIDO_CALAHUMANA', 'LISTO', 'ENTREGADO');

-- CreateTable
CREATE TABLE "tipo_tramite" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "requiere_valorado" BOOLEAN NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hoja_ruta" (
    "id" SERIAL NOT NULL,
    "nro_tramite" VARCHAR(20) NOT NULL,
    "gestion" SMALLINT NOT NULL,
    "file_id" INTEGER NOT NULL,
    "tipo_tramite_id" INTEGER NOT NULL,
    "estado_actual" "estado_hoja_ruta" NOT NULL DEFAULT 'RECIBIDO',
    "sede_actual_id" INTEGER NOT NULL,
    "nro_valorado" VARCHAR(30),
    "fecha_ingreso" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hoja_ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimiento_hoja_ruta" (
    "id" SERIAL NOT NULL,
    "hoja_ruta_id" INTEGER NOT NULL,
    "accion" VARCHAR(30) NOT NULL,
    "estado_anterior" "estado_hoja_ruta",
    "estado_nuevo" "estado_hoja_ruta" NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "observacion" VARCHAR(255),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_hoja_ruta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_tramite_codigo_key" ON "tipo_tramite"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "hoja_ruta_nro_tramite_key" ON "hoja_ruta"("nro_tramite");

-- CreateIndex
CREATE INDEX "hoja_ruta_file_id_idx" ON "hoja_ruta"("file_id");

-- CreateIndex
CREATE INDEX "hoja_ruta_estado_actual_idx" ON "hoja_ruta"("estado_actual");

-- CreateIndex
CREATE INDEX "movimiento_hoja_ruta_hoja_ruta_id_fecha_idx" ON "movimiento_hoja_ruta"("hoja_ruta_id", "fecha");

-- AddForeignKey
ALTER TABLE "hoja_ruta" ADD CONSTRAINT "hoja_ruta_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_academico"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hoja_ruta" ADD CONSTRAINT "hoja_ruta_tipo_tramite_id_fkey" FOREIGN KEY ("tipo_tramite_id") REFERENCES "tipo_tramite"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "hoja_ruta" ADD CONSTRAINT "hoja_ruta_sede_actual_id_fkey" FOREIGN KEY ("sede_actual_id") REFERENCES "sede"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "movimiento_hoja_ruta" ADD CONSTRAINT "movimiento_hoja_ruta_hoja_ruta_id_fkey" FOREIGN KEY ("hoja_ruta_id") REFERENCES "hoja_ruta"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "movimiento_hoja_ruta" ADD CONSTRAINT "movimiento_hoja_ruta_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "movimiento_hoja_ruta" ADD CONSTRAINT "movimiento_hoja_ruta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- ---------------------------------------------------------------------
-- SQL agregado a mano (SDD S3.1-S3.3 §2.1, §2.3).
-- ---------------------------------------------------------------------

-- Los 4 tipos que llegan a Ancocagua (D-21). Con valorado: historial y legalización (D-05).
INSERT INTO "tipo_tramite" ("codigo", "nombre", "requiere_valorado") VALUES
  ('HISTORIAL_ACADEMICO', 'Historial académico', true),
  ('LEGALIZACION_HISTORIAL', 'Legalización de historial académico', true),
  ('CERT_NOTAS_ANTERIOR', 'Certificado de notas de años pasados', false),
  ('CERT_EXCELENCIA_ANTERIOR', 'Certificado de excelencia de años pasados', false);

-- Cada movimiento actualiza su hoja de ruta: el estado nunca se desincroniza del último paso (DEC-006).
CREATE FUNCTION fn_movimiento_actualiza_hoja() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "hoja_ruta"
     SET "estado_actual" = NEW."estado_nuevo",
         "sede_actual_id" = NEW."sede_id",
         "fecha_cierre" = CASE WHEN NEW."estado_nuevo" = 'ENTREGADO' THEN NEW."fecha" ELSE "fecha_cierre" END,
         "updated_at" = NEW."fecha"
   WHERE "id" = NEW."hoja_ruta_id";
  RETURN NULL;
END
$$;

CREATE TRIGGER tg_movimiento_actualiza_hoja AFTER INSERT ON "movimiento_hoja_ruta"
  FOR EACH ROW EXECUTE FUNCTION fn_movimiento_actualiza_hoja();

-- Los movimientos son de solo inserción (ADR-0003, ADR-0005).
CREATE TRIGGER tg_movimiento_inmutable BEFORE UPDATE OR DELETE ON "movimiento_hoja_ruta"
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();
CREATE TRIGGER tg_movimiento_sin_truncate BEFORE TRUNCATE ON "movimiento_hoja_ruta"
  FOR EACH STATEMENT EXECUTE FUNCTION fn_solo_insercion();

-- Regla de S6.4: toda tabla nueva de solo inserción repite el REVOKE para la app.
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'siset_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON "movimiento_hoja_ruta" FROM siset_app;
  END IF;
END $$;
