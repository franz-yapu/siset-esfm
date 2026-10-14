-- S1.15 (DEC-026): gracia para un refresh recién rotado y sin usar.

-- AlterTable
ALTER TABLE "refresh_token" ADD COLUMN "reemplazado_por_id" INTEGER;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_reemplazado_por_id_fkey" FOREIGN KEY ("reemplazado_por_id") REFERENCES "refresh_token"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- Parámetro de la ventana de gracia (segundos).
INSERT INTO "parametro" ("clave", "valor", "descripcion", "updated_at") VALUES
  ('SEG_GRACIA_REFRESH', '10', 'Segundos en que un refresh recién rotado y sin usar todavía se acepta', now());
