-- CreateIndex
CREATE INDEX "log_auditoria_entidad_entidad_id_fecha_idx" ON "log_auditoria"("entidad", "entidad_id", "fecha" DESC);

-- ---------------------------------------------------------------------
-- SQL agregado a mano (SDD S6.4 §2.1). ADR-0003 §2 + DEC-008 #2: la API se conecta con
-- siset_app, distinto del dueño de las tablas, sin UPDATE/DELETE/TRUNCATE en la bitácora.
-- REGLA: toda tabla nueva de solo inserción (p. ej. movimiento_hoja_ruta, S3.x) repite el
-- REVOKE en su propia migración.
-- ---------------------------------------------------------------------

-- Los roles son de todo el servidor: se crea solo si no existe. La contraseña y LOGIN los
-- pone el despliegue (`npm run bd:rol-app`), nunca el repo.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'siset_app') THEN
    CREATE ROLE siset_app NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO siset_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO siset_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO siset_app;
REVOKE UPDATE, DELETE, TRUNCATE ON "log_auditoria" FROM siset_app;
REVOKE ALL ON "_prisma_migrations" FROM siset_app;

-- Tablas y secuencias que creen las migraciones futuras (las crea el dueño).
DO $$ BEGIN
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO siset_app', current_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO siset_app', current_user);
END $$;
