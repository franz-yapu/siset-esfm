-- ADR-0013: el estudiante (y Kardex) editan la dirección y la foto.
-- AlterTable
ALTER TABLE "persona" ADD COLUMN "direccion" VARCHAR(200);

-- CreateTable
CREATE TABLE "persona_foto" (
    "persona_id" INTEGER NOT NULL,
    "contenido" BYTEA NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_foto_pkey" PRIMARY KEY ("persona_id")
);

-- AddForeignKey
ALTER TABLE "persona_foto" ADD CONSTRAINT "persona_foto_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Hasta 1 MB y solo los tres tipos que acepta la API.
ALTER TABLE "persona_foto" ADD CONSTRAINT "ck_persona_foto_tamano" CHECK (octet_length("contenido") BETWEEN 1 AND 1048576);
ALTER TABLE "persona_foto" ADD CONSTRAINT "ck_persona_foto_tipo" CHECK ("tipo" IN ('image/jpeg', 'image/png', 'image/webp'));

