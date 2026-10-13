import { defineConfig } from 'prisma/config';

// Prisma 7 no carga `.env` por su cuenta. El archivo es opcional: en la CI las
// variables vienen del entorno.
try {
  process.loadEnvFile();
} catch {
  // Sin `.env`: se usan las variables del entorno.
}

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` no necesita conexión, así que la URL puede faltar ahí.
    url: process.env.DATABASE_URL ?? '',
  },
});
