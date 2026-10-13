import { fileURLToPath, URL } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    // Los tests de base de datos necesitan PostgreSQL: van en `npm run test:bd` (SDD S0.6 §2.7).
    exclude: [...configDefaults.exclude, 'test/bd/**'],
  },
});
