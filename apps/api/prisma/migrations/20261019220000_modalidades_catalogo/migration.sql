-- DEC-058: las modalidades de ingreso pasan a ser un catálogo que administra Kardex. Arranca con las cuatro de D-45;
-- el nombre largo lo pone Kardex (la escuela no lo dio).
CREATE TABLE "modalidad_ingreso" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(255),
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modalidad_ingreso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "modalidad_ingreso_codigo_key" ON "modalidad_ingreso"("codigo");
ALTER TABLE "modalidad_ingreso" ADD CONSTRAINT "ck_modalidad_codigo" CHECK ("codigo" ~ '^[A-Z0-9]{1,10}$');

INSERT INTO "modalidad_ingreso" ("codigo", "nombre", "orden") VALUES
  ('A', 'Modalidad A', 1),
  ('B1', 'Modalidad B1', 2),
  ('B2', 'Modalidad B2', 3),
  ('B3', 'Modalidad B3', 4);

-- El file guarda el código con FK al catálogo (en vez de la lista fija del CHECK).
ALTER TABLE "file_academico" DROP CONSTRAINT "ck_file_modalidad";
ALTER TABLE "file_academico" ALTER COLUMN "modalidad" SET DATA TYPE VARCHAR(10);
ALTER TABLE "file_academico" ADD CONSTRAINT "file_academico_modalidad_fkey" FOREIGN KEY ("modalidad")
  REFERENCES "modalidad_ingreso"("codigo") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- El requisito guarda la lista de códigos; el servicio los valida contra el catálogo. Aquí solo el formato.
ALTER TABLE "requisito_tipo" DROP CONSTRAINT "ck_requisito_tipo_modalidad";
ALTER TABLE "requisito_tipo" ALTER COLUMN "solo_modalidad" SET DATA TYPE VARCHAR(255);
ALTER TABLE "requisito_tipo" ADD CONSTRAINT "ck_requisito_tipo_modalidad"
  CHECK ("solo_modalidad" ~ '^[A-Z0-9]{1,10}(,[A-Z0-9]{1,10})*$');
