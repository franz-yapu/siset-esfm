import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unitarios + base de datos en una sola corrida, con cobertura (SDD S1.14 §2.3, DoD del PRD §6:
 * servicio ≥ 70 %). Necesita PostgreSQL como `test:bd`. Cada módulo suma su carpeta a `include`
 * en su ticket.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/bd/preparar-bd.ts'],
    // Una sola base de test: los archivos corren en serie.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/modulos/seguridad/**'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 70 },
    },
  },
});
