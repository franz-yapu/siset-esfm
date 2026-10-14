import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

const CI = Boolean(process.env.CI);
/** Con E2E_BASE_URL, la suite corre el proyecto `mock` contra un stack ya levantado (p. ej. Docker, SDD S0.4). */
const BASE_EXTERNA = process.env.E2E_BASE_URL;
/**
 * Con E2E_API_REAL=1 se suma el proyecto `api-real`: la web contra la API y PostgreSQL de verdad
 * (SDD S1.14 §2.4). Necesita la base migrada y con seed; sin la variable, nada cambia.
 */
const API_REAL = !BASE_EXTERNA && process.env.E2E_API_REAL === '1';
/** Puerto propio para no reutilizar una API de desarrollo (con su rate limit de 10/min). */
const PUERTO_API_E2E = 3100;
const PUERTO_WEB_API_REAL = 4182;

const servidor = (
  puerto: number,
  salida: string,
  usarApi: string,
  demo = 'true',
  extra: Record<string, string> = {},
) => ({
  command: `npx vite build --outDir ${salida} --emptyOutDir && npx vite preview --outDir ${salida} --port ${puerto} --strictPort`,
  url: `http://localhost:${puerto}`,
  env: { VITE_USAR_API: usarApi, VITE_DEMO: demo, ...extra },
  reuseExistingServer: !CI,
  timeout: 120_000,
});

/** La API de E2E: `tsx`, sin build. Lee apps/api/.env si existe; estas variables mandan. */
const apiE2E = {
  command: 'npm run start:e2e',
  cwd: '../api',
  url: `http://localhost:${PUERTO_API_E2E}/api/v1/health`,
  env: {
    PORT: String(PUERTO_API_E2E),
    CORS_ORIGEN: `http://localhost:${PUERTO_WEB_API_REAL}`,
    // Todas las pruebas salen de 127.0.0.1: el límite real (DEC-013 #4) ya tiene su propia prueba.
    LOGIN_LIMITE_POR_MINUTO: '1000',
    LOG_LEVEL: 'warn',
  },
  reuseExistingServer: !CI,
  timeout: 60_000,
};

const NO_MOCK = [/modo-api/, /api-real\//];

const proyectosApiReal: NonNullable<PlaywrightTestConfig['projects']> = API_REAL
  ? [
      {
        name: 'preparar-api-real',
        testMatch: /api-real\/preparar\.setup\.ts/,
        use: { baseURL: `http://localhost:${PUERTO_WEB_API_REAL}` },
      },
      {
        name: 'api-real',
        testMatch: /api-real\/.*\.spec\.ts/,
        dependencies: ['preparar-api-real'],
        use: { baseURL: `http://localhost:${PUERTO_WEB_API_REAL}` },
      },
    ]
  : [];

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
    ? [{ name: 'mock', testIgnore: NO_MOCK, use: { baseURL: BASE_EXTERNA } }]
    : [
        { name: 'mock', testIgnore: NO_MOCK, use: { baseURL: 'http://localhost:4180' } },
        { name: 'api', testMatch: /modo-api/, use: { baseURL: 'http://localhost:4181' } },
        ...proyectosApiReal,
      ],
  webServer: BASE_EXTERNA
    ? []
    : [
        servidor(4180, 'dist-e2e-mock', 'false'),
        servidor(4181, 'dist-e2e-api', 'auth,bitacora,files'),
        ...(API_REAL
          ? [
              apiE2E,
              // `vite preview` hereda el proxy /api del vite.config: mismo origen, como en producción.
              servidor(PUERTO_WEB_API_REAL, 'dist-e2e-api-real', 'auth,usuarios,bitacora,files', 'false', {
                API_PROXY: `http://localhost:${PUERTO_API_E2E}`,
              }),
            ]
          : []),
      ],
});
