-- DEC-054: rol Administrador (usuarios, roles y bitácora). El seed también lo crea; la migración lo deja en las
-- bases que ya existen.
INSERT INTO "rol" ("codigo", "nombre", "descripcion")
VALUES ('ADMIN', 'Administrador', 'Administrador del sistema: usuarios, roles y bitácora (DEC-054)')
ON CONFLICT ("codigo") DO NOTHING;

-- D-45b (hoja, 19-oct): el certificado de calificaciones de 1.º a 4.º de secundaria es solo para la modalidad B1, y
-- obligatorio. Desde DEC-055 el seed ya no pisa el catálogo: los cambios de la escuela van por migración.
UPDATE "requisito_tipo"
SET "solo_modalidad" = 'B1', "obligatorio" = TRUE, "descripcion" = 'Solo modalidad B1 (D-45b).'
WHERE "codigo" = 'CALIF_SECUNDARIA';
