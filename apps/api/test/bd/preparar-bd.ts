import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    urlBdTest: string;
  }
}

const PREFIJO = 'siset_test_';

/**
 * Base temporal por corrida (SDD S0.6 v1.1 §2.7): crea una base nueva, le aplica
 * las migraciones con `migrate deploy` (no destructivo) y al terminar elimina
 * solo esa base. Nunca vacía una base existente.
 */
export default async function prepararBd(project: TestProject): Promise<() => Promise<void>> {
  try {
    process.loadEnvFile();
  } catch {
    // Sin `.env`: en la CI DATABASE_URL_TEST viene del entorno.
  }
  const base = process.env.DATABASE_URL_TEST;
  if (!base) {
    throw new Error('Falta DATABASE_URL_TEST. Levantá la base con `docker compose up -d db` y revisá apps/api/.env.');
  }

  const nombre = `${PREFIJO}${Date.now()}_${process.pid}`;
  const url = new URL(base);
  url.pathname = `/${nombre}`;
  const mantenimiento = new URL(base);
  mantenimiento.pathname = '/postgres';

  await conAdmin(mantenimiento.href, (c) => c.query(`CREATE DATABASE "${nombre}"`));
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url.href },
    stdio: 'inherit',
  });
  project.provide('urlBdTest', url.href);

  return async () => {
    if (!nombre.startsWith(PREFIJO)) return; // salvaguarda: solo la base que creó esta corrida
    await conAdmin(mantenimiento.href, (c) => c.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`));
  };
}

async function conAdmin(url: string, fn: (c: Client) => Promise<unknown>): Promise<void> {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await fn(c);
  } finally {
    await c.end();
  }
}
