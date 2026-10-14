import { expect, test, type Page } from '@playwright/test';

// Sesión real contra la API simulada (SDD S1.10 §4): restaurar al recargar, refresh ante un
// 401 e inactividad. El E2E con el backend real es de S1.14.

const usuarioApi = (debeCambiarPassword = false) => ({
  id: 7,
  usuario: '1234567',
  nombre: 'Ana Mamani Quispe',
  rol: 'KARDEX',
  sedeId: 2,
  activo: true,
  debeCambiarPassword,
  ultimoAcceso: null,
});

const sesion = (accessToken: string, debeCambiarPassword = false) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    accessToken,
    expiraEn: '2099-01-01T00:00:00.000Z',
    usuario: usuarioApi(debeCambiarPassword),
  }),
});

const error401 = (code: string) => ({
  status: 401,
  contentType: 'application/json',
  body: JSON.stringify({ error: { code, message: 'Su sesión terminó. Vuelva a iniciar sesión.' } }),
});

/** Simula la API de sesión; `refreshOk` decide si la cookie sigue viva. Cuenta las llamadas. */
async function simularApi(page: Page, o: { debeCambiarPassword?: boolean } = {}) {
  const estado = { refreshOk: false, refresh: 0, logout: 0 };
  await page.route('**/api/v1/auth/login', (r) => r.fulfill(sesion('jwt-login', o.debeCambiarPassword)));
  await page.route('**/api/v1/auth/refresh', (r) => {
    estado.refresh++;
    return r.fulfill(estado.refreshOk ? sesion(`jwt-refresh-${estado.refresh}`) : error401('SESION_INVALIDA'));
  });
  await page.route('**/api/v1/auth/logout', (r) => {
    estado.logout++;
    estado.refreshOk = false;
    return r.fulfill({ status: 204 });
  });
  return estado;
}

async function ingresar(page: Page) {
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill('1234567');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave.123');
  await page.getByRole('button', { name: /ingresar/i }).click();
}

test('al recargar con la cookie vigente se restaura la sesión sin pasar por el login', async ({ page }) => {
  const api = await simularApi(page);
  await ingresar(page);
  await expect(page).toHaveURL(/\/kardex/);
  api.refreshOk = true;
  const antes = api.refresh;
  await page.reload();
  await expect(page).toHaveURL(/\/kardex/);
  expect(api.refresh).toBe(antes + 1);
  const guardado = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
  expect(guardado).toBe('{}');
});

test('al recargar sin sesión en el servidor se vuelve al login sin mensaje', async ({ page }) => {
  await simularApi(page);
  await ingresar(page);
  await expect(page).toHaveURL(/\/kardex/);
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/tu sesión/i)).toHaveCount(0);
});

test('un 401 con sesión dispara el refresh y reintenta con el Bearer nuevo', async ({ page }) => {
  const api = await simularApi(page, { debeCambiarPassword: true });
  const autorizaciones: (string | null)[] = [];
  await page.route('**/api/v1/auth/cambiar-password', async (r) => {
    const auth = await r.request().headerValue('authorization');
    autorizaciones.push(auth);
    await r.fulfill(auth === 'Bearer jwt-login' ? error401('NO_AUTENTICADO') : sesion('jwt-cpw'));
  });
  await ingresar(page);
  await expect(page).toHaveURL(/\/cambiar-clave/);
  api.refreshOk = true;
  await page.getByLabel('Contraseña actual').fill('clave.123');
  await page.getByLabel('Nueva contraseña').fill('nueva.clave-2');
  await page.getByLabel('Repetir contraseña').fill('nueva.clave-2');
  await page.getByRole('button', { name: /guardar contraseña/i }).click();
  await expect(page).toHaveURL(/\/kardex/);
  expect(autorizaciones).toHaveLength(2);
  expect(autorizaciones[0]).toBe('Bearer jwt-login');
  expect(autorizaciones[1]).toMatch(/^Bearer jwt-refresh-/);
});

test('14 min sin actividad avisan; seguir conectado lo cierra; a los 15 min se cierra la sesión', async ({ page }) => {
  await page.clock.install();
  const api = await simularApi(page);
  await ingresar(page);
  await expect(page).toHaveURL(/\/kardex/);

  await page.clock.fastForward('14:01');
  const aviso = page.getByRole('dialog', { name: /sigues ahí/i });
  await expect(aviso).toBeVisible();
  await aviso.getByRole('button', { name: /seguir conectado/i }).click();
  await expect(aviso).toBeHidden();

  await page.clock.fastForward('15:01');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/se cerró tras 15 minutos sin actividad/i)).toBeVisible();
  expect(api.logout).toBe(1);
});

test('al volver con la última actividad vencida no se restaura: se cierra y se avisa', async ({ page }) => {
  const api = await simularApi(page);
  await ingresar(page);
  await expect(page).toHaveURL(/\/kardex/);
  api.refreshOk = true;
  const antes = api.refresh;
  await page.evaluate(() => localStorage.setItem('siset.ultimaActividad', String(Date.now() - 16 * 60_000)));
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/se cerró tras 15 minutos sin actividad/i)).toBeVisible();
  expect(api.refresh).toBe(antes);
  expect(api.logout).toBe(1);
});
