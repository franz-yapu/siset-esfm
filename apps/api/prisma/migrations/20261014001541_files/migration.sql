-- CreateEnum
CREATE TYPE "condicion_estudiante" AS ENUM ('ESTUDIANTE', 'EGRESADO');

-- CreateEnum
CREATE TYPE "estado_requisito" AS ENUM ('PENDIENTE', 'COMPLETO', 'OBSERVADO');

-- CreateEnum
CREATE TYPE "nivel_tclo" AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO');

-- CreateTable
CREATE TABLE "requisito_tipo" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(255),
    "anio_formacion" SMALLINT,
    "nivel" "nivel_tclo",
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "requisito_tipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_academico" (
    "id" SERIAL NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "codigo_estudiante" VARCHAR(20) NOT NULL,
    "especialidad_id" INTEGER NOT NULL,
    "anio_ingreso" SMALLINT NOT NULL,
    "condicion" "condicion_estudiante" NOT NULL DEFAULT 'ESTUDIANTE',
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "motivo_bloqueo" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "file_academico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisito_file" (
    "id" SERIAL NOT NULL,
    "file_id" INTEGER NOT NULL,
    "requisito_tipo_id" INTEGER NOT NULL,
    "estado" "estado_requisito" NOT NULL DEFAULT 'PENDIENTE',
    "fecha" DATE,
    "nro_documento" VARCHAR(40),
    "observacion" VARCHAR(255),
    "registrado_por" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "requisito_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "requisito_tipo_codigo_key" ON "requisito_tipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "file_academico_persona_id_key" ON "file_academico"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_academico_codigo_estudiante_key" ON "file_academico"("codigo_estudiante");

-- CreateIndex
CREATE INDEX "file_academico_especialidad_id_idx" ON "file_academico"("especialidad_id");

-- CreateIndex
CREATE INDEX "requisito_file_requisito_tipo_id_idx" ON "requisito_file"("requisito_tipo_id");

-- CreateIndex
CREATE UNIQUE INDEX "requisito_file_file_id_requisito_tipo_id_key" ON "requisito_file"("file_id", "requisito_tipo_id");

-- AddForeignKey
ALTER TABLE "file_academico" ADD CONSTRAINT "file_academico_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "file_academico" ADD CONSTRAINT "file_academico_especialidad_id_fkey" FOREIGN KEY ("especialidad_id") REFERENCES "especialidad"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "requisito_file" ADD CONSTRAINT "requisito_file_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_academico"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "requisito_file" ADD CONSTRAINT "requisito_file_requisito_tipo_id_fkey" FOREIGN KEY ("requisito_tipo_id") REFERENCES "requisito_tipo"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "requisito_file" ADD CONSTRAINT "requisito_file_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------
-- SQL agregado a mano (SDD S2.1 §2.2, v1.1). Ver docs/product/modelo-datos.md §files.
-- ---------------------------------------------------------------------
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_anio" CHECK ("anio_ingreso" BETWEEN 1990 AND 2100);
-- Un bloqueo sin explicación no sirve (RF-07 CA3): tampoco vale el motivo vacío.
ALTER TABLE "file_academico" ADD CONSTRAINT "ck_file_motivo"
  CHECK (NOT "bloqueado" OR ("motivo_bloqueo" IS NOT NULL AND btrim("motivo_bloqueo") <> ''));
ALTER TABLE "requisito_file" ADD CONSTRAINT "ck_requisito_completo"
  CHECK ("estado" <> 'COMPLETO' OR ("fecha" IS NOT NULL AND "registrado_por" IS NOT NULL));
ALTER TABLE "requisito_tipo" ADD CONSTRAINT "ck_requisito_tipo_anio" CHECK ("anio_formacion" BETWEEN 1 AND 5);
