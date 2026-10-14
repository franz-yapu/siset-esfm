import pg from 'pg';

/**
 * Activa el rol siset_app con su contraseña (SDD S6.4 §2.1). Lo corre el despliegue después
 * de `migrate deploy`, con la conexión del dueño (DATABASE_URL). Idempotente; nunca imprime
 * la contraseña.
 */
export async function configurarRolApp(entorno: Record<string, string | undefined> = process.env): Promise<void> {
  const url = entorno.DATABASE_URL;
  const password = entorno.APP_DB_PASSWORD;
  if (!url) throw new Error('Falta DATABASE_URL: la conexión del dueño de las tablas.');
  if (!password || password.length < 16) {
    throw new Error('Falta APP_DB_PASSWORD o tiene menos de 16 caracteres: la contraseña del rol siset_app.');
  }
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    // ALTER ROLE no acepta parámetros: se escapa como literal con la función del servidor.
    const { rows } = await c.query<{ literal: string }>('SELECT quote_literal($1) AS literal', [password]);
    await c.query(`ALTER ROLE siset_app LOGIN PASSWORD ${rows[0].literal}`);
  } finally {
    await c.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.loadEnvFile();
  } catch {
    // Sin .env: las variables vienen del entorno.
  }
  try {
    await configurarRolApp();
    // eslint-disable-next-line no-console
    console.info('Rol siset_app listo.');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error((e as Error).message);
    process.exit(1);
  }
}
