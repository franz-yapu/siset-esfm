-- DEC-063: la misma persona puede tener una cuenta por rol (el Kardex que también administra tiene `<CI>-ADM`).
-- DropIndex
DROP INDEX "usuario_persona_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "usuario_persona_id_rol_id_key" ON "usuario"("persona_id", "rol_id");
