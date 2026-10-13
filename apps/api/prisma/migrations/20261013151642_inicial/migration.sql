-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "modulo" VARCHAR(30) NOT NULL,
    "entidad" VARCHAR(50) NOT NULL,
    "entidad_id" VARCHAR(50),
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "ip" VARCHAR(45),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especialidad" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "especialidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" BIGSERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "rol_id" BIGINT NOT NULL,
    "ci" VARCHAR(20) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_auditoria_fecha_idx" ON "log_auditoria"("fecha");

-- CreateIndex
CREATE INDEX "log_auditoria_usuario_id_fecha_idx" ON "log_auditoria"("usuario_id", "fecha");

-- CreateIndex
CREATE INDEX "log_auditoria_modulo_fecha_idx" ON "log_auditoria"("modulo", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "sede_codigo_key" ON "sede"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "especialidad_nombre_key" ON "especialidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rol_codigo_key" ON "rol"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_ci_key" ON "usuario"("ci");

-- CreateIndex
CREATE INDEX "usuario_rol_id_idx" ON "usuario"("rol_id");

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Agregado a mano (SDD S0.6 §2.2): zona horaria de la base. Se usa
-- current_database() para que funcione igual en desarrollo, test y CI.
-- Los instantes se guardan en UTC; esto afecta now()::date, date_trunc y psql.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/La_Paz');
END
$$;
