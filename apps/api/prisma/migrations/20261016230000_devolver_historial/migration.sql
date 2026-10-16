-- DEC-053 (D-48), ADR-0008: el historial con observación no se imprime y se devuelve; el trámite termina en SISET.
ALTER TYPE "estado_hoja_ruta" ADD VALUE 'DEVUELTO';

-- La fecha de cierre también se pone al devolver: un trámite devuelto ya no está en curso ni atrasado.
CREATE OR REPLACE FUNCTION fn_movimiento_actualiza_hoja() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE "hoja_ruta"
     SET "estado_actual" = NEW."estado_nuevo",
         "sede_actual_id" = NEW."sede_id",
         "fecha_cierre" = CASE WHEN NEW."estado_nuevo" IN ('ENTREGADO', 'DEVUELTO') THEN NEW."fecha" ELSE "fecha_cierre" END,
         "updated_at" = NEW."fecha"
   WHERE "id" = NEW."hoja_ruta_id";
  RETURN NULL;
END
$$;
