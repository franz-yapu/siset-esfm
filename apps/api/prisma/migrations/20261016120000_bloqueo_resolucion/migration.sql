-- CreateEnum
CREATE TYPE "causa_bloqueo" AS ENUM ('LICENCIA_OBLIGATORIA', 'LICENCIA_VOLUNTARIA');

-- CreateTable
CREATE TABLE "bloqueo_file" (
    "id" SERIAL NOT NULL,
    "file_id" INTEGER NOT NULL,
    "causa" "causa_bloqueo" NOT NULL,
    "nro_resolucion" VARCHAR(100) NOT NULL,
    "fecha_resolucion" DATE NOT NULL,
    "glosa" VARCHAR(255) NOT NULL,
    "pdf" BYTEA NOT NULL,
    "pdf_nombre" VARCHAR(120) NOT NULL,
    "bloqueado_por" INTEGER,
    "bloqueado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desbloqueado_por" INTEGER,
    "desbloqueado_en" TIMESTAMPTZ(6),

    CONSTRAINT "bloqueo_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bloqueo_file_file_id_idx" ON "bloqueo_file"("file_id");

-- AddForeignKey
ALTER TABLE "bloqueo_file" ADD CONSTRAINT "bloqueo_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_academico"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bloqueo_file" ADD CONSTRAINT "bloqueo_file_bloqueado_por_fkey" FOREIGN KEY ("bloqueado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bloqueo_file" ADD CONSTRAINT "bloqueo_file_desbloqueado_por_fkey" FOREIGN KEY ("desbloqueado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- ---------------------------------------------------------------------
-- SQL agregado a mano (D-29, DEC-049).
-- ---------------------------------------------------------------------
-- Un solo bloqueo abierto (sin desbloqueo) por file.
CREATE UNIQUE INDEX "uq_bloqueo_abierto" ON "bloqueo_file"("file_id") WHERE "desbloqueado_en" IS NULL;
-- El PDF de la resolución: no vacío y hasta 5 MB.
ALTER TABLE "bloqueo_file" ADD CONSTRAINT "ck_bloqueo_pdf"
  CHECK (octet_length("pdf") BETWEEN 1 AND 5242880);
ALTER TABLE "bloqueo_file" ADD CONSTRAINT "ck_bloqueo_textos"
  CHECK (btrim("nro_resolucion") <> '' AND btrim("glosa") <> '' AND btrim("pdf_nombre") <> '');
-- Quien desbloquea solo se anota con la fecha del desbloqueo.
ALTER TABLE "bloqueo_file" ADD CONSTRAINT "ck_bloqueo_desbloqueo"
  CHECK ("desbloqueado_por" IS NULL OR "desbloqueado_en" IS NOT NULL);
