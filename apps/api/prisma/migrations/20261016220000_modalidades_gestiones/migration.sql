-- AlterTable
ALTER TABLE "requisito_tipo" ADD COLUMN     "solo_anios_terminados" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "solo_modalidad" SET DATA TYPE VARCHAR(20);

-- ---------------------------------------------------------------------
-- SQL agregado a mano (D-45, DEC-052). Primero se quitan los CHECK viejos, luego se convierten los datos.
-- ---------------------------------------------------------------------
ALTER TABLE "file_academico" DROP CONSTRAINT "ck_file_modalidad";
ALTER TABLE "requisito_tipo" DROP CONSTRAINT "ck_requisito_tipo_modalidad";
-- Las modalidades son A, B1, B2 y B3 (D-45); una modalidad anterior fuera de la lista se borra.
UPDATE "file_academico" SET "modalidad" = NULL WHERE "modalidad" NOT IN ('A', 'B1', 'B2', 'B3');
-- "Solo modalidad B" del folder: provisional, B1, B2 y B3 (D-45b); el seed lo deja como "si corresponde".
UPDATE "requisito_tipo" SET "solo_modalidad" = 'B1,B2,B3' WHERE "solo_modalidad" = 'B';
UPDATE "requisito_tipo" SET "solo_modalidad" = NULL
  WHERE "solo_modalidad" !~ '^(A|B1|B2|B3)(,(A|B1|B2|B3))*$';
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_modalidad" CHECK ("modalidad" IN ('A', 'B1', 'B2', 'B3'));
ALTER TABLE "requisito_tipo" ADD CONSTRAINT "ck_requisito_tipo_modalidad"
  CHECK ("solo_modalidad" ~ '^(A|B1|B2|B3)(,(A|B1|B2|B3))*$');
