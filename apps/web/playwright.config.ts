import { defineConfig } from '@playwright/test';

const CI = Boolean(process.env.CI);
/** Con E2E_BASE_URL, la suite corre el proyecto `mock` contra un stack ya levantado (p. ej. Docker, SDD S0.4). */
const BASE_EXTERNA = process.env.E2E_BASE_URL;
const servidor = (puerto: number, salida: string, usarApi: string) => ({
  command: `npx vite build --outDir ${salida} --emptyOutDir && npx vite preview --outDir ${salida} --port ${puerto} --strictPort`,
  url: `http://localhost:${puerto}`,
  env: { VITE_USAR_API: usarApi, VITE_DEMO: 'true' },
  reuseExistingServer: !CI,
  timeout: 120_000,
});

/**
 * E2E del prototipo (SDD S0.8 §2.6). Usa el Google Chrome instalado
 * (`channel: 'chrome'`): no descarga navegadores.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    // Solo para probar localmente un proxy con certificado autofirmado (SDD S0.9).
    ignoreHTTPSErrors: Boolean(process.env.E2E_IGNORAR_TLS),
  },
  projects: BASE_EXTERNA
    ? [{ name: 'mock', testIgnore: /modo-api/, use: { baseURL: BASE_EXTERNA } }]
    : [
        { name: 'mock', testIgnore: /modo-api/, use: { baseURL: 'http://localhost:4180' } },
        { name: 'api', testMatch: /modo-api/, use: { baseURL: 'http://localhost:4181' } },
      ],
  webServer: BASE_EXTERNA
    ? []
    : [servidor(4180, 'dist-e2e-mock', 'false'), servidor(4181, 'dist-e2e-api', 'auth,bitacora')],
});
