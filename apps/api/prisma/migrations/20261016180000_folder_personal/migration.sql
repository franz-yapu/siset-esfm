-- CreateEnum
CREATE TYPE "genero" AS ENUM ('FEMENINO', 'MASCULINO');

-- DropIndex
DROP INDEX "requisito_file_file_id_requisito_tipo_id_key";

-- AlterTable
ALTER TABLE "file_academico" ADD COLUMN     "anio_formacion" SMALLINT,
ADD COLUMN     "genero" "genero",
ADD COLUMN     "modalidad" VARCHAR(5);

-- AlterTable
ALTER TABLE "requisito_file" ADD COLUMN     "entidad_emisora" VARCHAR(150),
ADD COLUMN     "gestion" VARCHAR(10) NOT NULL DEFAULT '',
ADD COLUMN     "nombre_curso" VARCHAR(150);

-- AlterTable
ALTER TABLE "requisito_tipo" ADD COLUMN     "orden" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "pide_curso" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "por_gestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "solo_genero" "genero",
ADD COLUMN     "solo_modalidad" VARCHAR(5);

-- CreateIndex
CREATE UNIQUE INDEX "requisito_file_file_id_requisito_tipo_id_gestion_key" ON "requisito_file"("file_id", "requisito_tipo_id", "gestion");


-- ---------------------------------------------------------------------
-- SQL agregado a mano (DEC-051, ADR-0007).
-- ---------------------------------------------------------------------
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_anio_formacion" CHECK ("anio_formacion" BETWEEN 1 AND 5);
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_modalidad" CHECK ("modalidad" ~ '^[A-Z][A-Z0-9]{0,4}$');
-- La gestión es vacía o "2023", "I/2025", "II/2025".
ALTER TABLE "requisito_file" ADD CONSTRAINT "ck_requisito_gestion" CHECK ("gestion" ~ '^((I|II)/)?[0-9]{4}$' OR "gestion" = '');
ALTER TABLE "requisito_tipo" ADD CONSTRAINT "ck_requisito_tipo_modalidad" CHECK ("solo_modalidad" ~ '^[A-Z][A-Z0-9]{0,4}$');
-- El certificado de notas pasa a ser por gestión: lo ya registrado queda en el año de su fecha.
UPDATE "requisito_file" rf SET "gestion" = EXTRACT(YEAR FROM COALESCE(rf."fecha", rf."updated_at"))::text
  FROM "requisito_tipo" rt WHERE rt."id" = rf."requisito_tipo_id" AND rt."codigo" = 'CERT_NOTAS';
