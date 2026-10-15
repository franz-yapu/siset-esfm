-- S3.2 (ADR-0006, DEC-035): correlativo HR-AAAA-NNNNNN por gestión.

-- CreateTable
CREATE TABLE "hoja_ruta_correlativo" (
    "gestion" SMALLINT NOT NULL,
    "ultimo" INTEGER NOT NULL,

    CONSTRAINT "hoja_ruta_correlativo_pkey" PRIMARY KEY ("gestion")
);


-- ---------------------------------------------------------------------
-- SQL agregado a mano (SDD S3.2-S3.4 §2.1, ADR-0006).
-- ---------------------------------------------------------------------

-- Siguiente número de la gestión. La fila queda bloqueada hasta el fin de la transacción de la ingesta: las
-- ingestas simultáneas se ordenan y un rollback libera el número (sin huecos ni repetidos).
CREATE FUNCTION fn_siguiente_nro_hoja_ruta(p_gestion SMALLINT) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_ultimo INTEGER;
BEGIN
  INSERT INTO "hoja_ruta_correlativo" ("gestion", "ultimo") VALUES (p_gestion, 1)
  ON CONFLICT ("gestion") DO UPDATE SET "ultimo" = "hoja_ruta_correlativo"."ultimo" + 1
  RETURNING "ultimo" INTO v_ultimo;
  IF v_ultimo > 999999 THEN
    RAISE EXCEPTION 'Se agotó el correlativo de hojas de ruta de la gestión %', p_gestion;
  END IF;
  RETURN 'HR-' || p_gestion || '-' || lpad(v_ultimo::text, 6, '0');
END
$$;
