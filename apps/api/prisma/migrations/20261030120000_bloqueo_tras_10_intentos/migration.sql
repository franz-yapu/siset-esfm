-- La cuenta se bloquea recién al 10.º intento fallido seguido, no al 5.º (pedido del responsable, DEC-065, ADR-0014).
UPDATE "parametro" SET "valor" = '10', "updated_at" = now() WHERE "clave" = 'MAX_INTENTOS_LOGIN';
