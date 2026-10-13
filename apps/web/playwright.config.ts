import { defineConfig } from '@playwright/test';

const CI = Boolean(process.env.CI);
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
  use: { channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  projects: [
    { name: 'mock', testIgnore: /modo-api/, use: { baseURL: 'http://localhost:4180' } },
    { name: 'api', testMatch: /modo-api/, use: { baseURL: 'http://localhost:4181' } },
  ],
  webServer: [servidor(4180, 'dist-e2e-mock', 'false'), servidor(4181, 'dist-e2e-api', 'auth')],
});
