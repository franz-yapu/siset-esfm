-- D-32b (ADR-0011): dónde se recibió el trámite. Con el valorado decide el flujo: un certificado recibido por
-- Secretaría de Coordinación en Ancocagua se entrega allí, sin pasar por Calahumana.
ALTER TABLE "hoja_ruta" ADD COLUMN "sede_ingreso_id" INTEGER;

-- Los trámites que ya hay se recibieron donde se registró su ingesta (hasta hoy, siempre Calahumana).
UPDATE "hoja_ruta" h
SET "sede_ingreso_id" = m."sede_id"
FROM "movimiento_hoja_ruta" m
WHERE m."hoja_ruta_id" = h."id" AND m."accion" = 'REGISTRAR';
UPDATE "hoja_ruta" SET "sede_ingreso_id" = (SELECT "id" FROM "sede" WHERE "codigo" = 'LA_PAZ')
WHERE "sede_ingreso_id" IS NULL;

ALTER TABLE "hoja_ruta" ALTER COLUMN "sede_ingreso_id" SET NOT NULL;
CREATE INDEX "hoja_ruta_sede_ingreso_id_idx" ON "hoja_ruta"("sede_ingreso_id");
ALTER TABLE "hoja_ruta" ADD CONSTRAINT "hoja_ruta_sede_ingreso_id_fkey" FOREIGN KEY ("sede_ingreso_id")
  REFERENCES "sede"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
