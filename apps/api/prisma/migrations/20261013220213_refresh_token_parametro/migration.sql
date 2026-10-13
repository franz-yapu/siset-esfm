-- CreateTable
CREATE TABLE "parametro" (
    "clave" VARCHAR(50) NOT NULL,
    "valor" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parametro_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "revocado_en" TIMESTAMPTZ(6),
    "ip" INET,
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_usuario_id_idx" ON "refresh_token"("usuario_id");

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- ---------------------------------------------------------------------
-- SQL agregado a mano (SDD S1.1 §2.2). Ver docs/product/modelo-datos.md §catalogos.
-- ---------------------------------------------------------------------

-- Parámetros de login (business-rules.md §Seguridad). Los cambia Kardex más adelante; el seed no los pisa.
INSERT INTO "parametro" ("clave", "valor", "descripcion", "updated_at") VALUES
  ('MAX_INTENTOS_LOGIN', '5',  'Intentos fallidos seguidos antes de bloquear la cuenta', now()),
  ('MIN_BLOQUEO_LOGIN',  '15', 'Minutos de bloqueo después de superar los intentos', now());
