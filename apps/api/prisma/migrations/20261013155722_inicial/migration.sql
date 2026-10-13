-- CreateTable
CREATE TABLE "log_auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(40) NOT NULL,
    "modulo" VARCHAR(40) NOT NULL,
    "entidad" VARCHAR(40),
    "entidad_id" VARCHAR(40),
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "ip" INET,
    "user_agent" VARCHAR(255),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sede" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "direccion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especialidad" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "especialidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" SERIAL NOT NULL,
    "ci" VARCHAR(15) NOT NULL,
    "complemento" VARCHAR(5) NOT NULL DEFAULT '',
    "nombres" VARCHAR(80) NOT NULL,
    "apellido_paterno" VARCHAR(60),
    "apellido_materno" VARCHAR(60),
    "fecha_nacimiento" DATE,
    "celular" VARCHAR(20),
    "email" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "persona_id" INTEGER NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "sede_id" INTEGER,
    "username" VARCHAR(40) NOT NULL,
    "password_hash" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "intentos_fallidos" SMALLINT NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_auditoria_fecha_idx" ON "log_auditoria"("fecha" DESC);

-- CreateIndex
CREATE INDEX "log_auditoria_usuario_id_fecha_idx" ON "log_auditoria"("usuario_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "log_auditoria_modulo_fecha_idx" ON "log_auditoria"("modulo", "fecha" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sede_codigo_key" ON "sede"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "especialidad_nombre_key" ON "especialidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "persona_ci_complemento_key" ON "persona"("ci", "complemento");

-- CreateIndex
CREATE UNIQUE INDEX "rol_codigo_key" ON "rol"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_persona_id_key" ON "usuario"("persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE INDEX "usuario_rol_id_idx" ON "usuario"("rol_id");

-- CreateIndex
CREATE INDEX "usuario_sede_id_idx" ON "usuario"("sede_id");

-- AddForeignKey
ALTER TABLE "log_auditoria" ADD CONSTRAINT "log_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sede"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- =====================================================================
-- Agregado a mano (SDD S0.11 §2.2, docs/product/modelo-datos.md).
-- Prisma no modela CHECK ni triggers; no los toca en migraciones futuras.
-- =====================================================================

-- persona: al menos un apellido
ALTER TABLE "persona" ADD CONSTRAINT "ck_persona_apellido"
  CHECK ("apellido_paterno" IS NOT NULL OR "apellido_materno" IS NOT NULL);

-- usuario: el contador de intentos nunca es negativo
ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_intentos" CHECK ("intentos_fallidos" >= 0);

-- log_auditoria: solo inserción (ADR-0003). Por fila para UPDATE/DELETE y por
-- sentencia para TRUNCATE, que un trigger de fila no detiene (E2).
CREATE FUNCTION fn_solo_insercion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de solo inserción: no se permite %', TG_TABLE_NAME, TG_OP;
END
$$;

CREATE TRIGGER tg_auditoria_inmutable BEFORE UPDATE OR DELETE ON "log_auditoria"
  FOR EACH ROW EXECUTE FUNCTION fn_solo_insercion();
CREATE TRIGGER tg_auditoria_sin_truncate BEFORE TRUNCATE ON "log_auditoria"
  FOR EACH STATEMENT EXECUTE FUNCTION fn_solo_insercion();

-- Zona horaria de la base. Se usa current_database() para que funcione igual
-- en desarrollo, test y CI. Los instantes se guardan en UTC; esto afecta
-- now()::date, date_trunc y psql.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/La_Paz');
END
$$;
