import { expect, test, type Page } from '@playwright/test';

// Login y cambio obligatorio de contraseña contra la API simulada (SDD S1.9 §4). El E2E con
// el backend real es de S1.14.

const AVISO_BLOQUEO = /varios intentos fallidos seguidos bloquean la cuenta/i;

const usuarioApi = (debeCambiarPassword: boolean) => ({
  id: 7,
  usuario: '1234567',
  nombre: 'Ana Mamani Quispe',
  rol: 'KARDEX',
  sedeId: 2,
  activo: true,
  debeCambiarPassword,
  ultimoAcceso: null,
});

const sesion = (accessToken: string, debeCambiarPassword: boolean) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ accessToken, expiraEn: '2099-01-01T00:00:00.000Z', usuario: usuarioApi(debeCambiarPassword) }),
});

const error = (status: number, code: string, message: string, details?: unknown) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ error: { code, message, details } }),
});

async function ingresar(page: Page, password = 'temporal-1.') {
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill('1234567');
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /ingresar/i }).click();
}

test('401 muestra el mensaje de la API y el aviso de bloqueo, y borra la contraseña', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (r) =>
    r.fulfill(error(401, 'CREDENCIALES_INVALIDAS', 'CI o contraseña incorrectos.')),
  );
  await ingresar(page, 'mala');
  await expect(page.getByText('CI o contraseña incorrectos.')).toBeVisible();
  await expect(page.getByText(AVISO_BLOQUEO)).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await expect(page).toHaveURL(/\/login/);
});

test('429 muestra su mensaje sin el aviso de bloqueo', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (r) =>
    r.fulfill(error(429, 'DEMASIADAS_PETICIONES', 'Demasiadas peticiones. Intente en un minuto.')),
  );
  await ingresar(page);
  await expect(page.getByText('Demasiadas peticiones. Intente en un minuto.')).toBeVisible();
  await expect(page.getByText(AVISO_BLOQUEO)).toHaveCount(0);
});

test('con debeCambiarPassword pasa por P-03: la actual mala marca su campo y la correcta entra al inicio', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/login', (r) => r.fulfill(sesion('jwt-login', true)));
  const cuerpos: unknown[] = [];
  const autorizaciones: (string | undefined)[] = [];
  await page.route('**/api/v1/auth/cambiar-password', async (r) => {
    const cuerpo = r.request().postDataJSON() as { passwordActual: string };
    cuerpos.push(cuerpo);
    autorizaciones.push(
      await r
        .request()
        .headerValue('authorization')
        .then((v) => v ?? undefined),
    );
    await r.fulfill(
      cuerpo.passwordActual === 'temporal-1.'
        ? sesion('jwt-nuevo', false)
        : error(422, 'PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta.'),
    );
  });

  await ingresar(page);
  await expect(page).toHaveURL(/\/cambiar-clave/);
  await expect(page.getByText(/tu contraseña es temporal/i)).toBeVisible();

  await page.getByLabel('Contraseña actual').fill('equivocada');
  await page.getByLabel('Nueva contraseña').fill('nueva.clave-2');
  await page.getByLabel('Repetir contraseña').fill('nueva.clave-2');
  await page.getByRole('button', { name: /guardar contraseña/i }).click();
  await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();
  await expect(page).toHaveURL(/\/cambiar-clave/);

  await page.getByLabel('Contraseña actual').fill('temporal-1.');
  await page.getByRole('button', { name: /guardar contraseña/i }).click();
  await expect(page).toHaveURL(/\/kardex/);

  expect(cuerpos.at(-1)).toEqual({ passwordActual: 'temporal-1.', passwordNueva: 'nueva.clave-2' });
  expect(autorizaciones.at(-1)).toBe('Bearer jwt-login');
});

test('P-03 permite cerrar sesión', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (r) => r.fulfill(sesion('jwt-login', true)));
  let logout = false;
  await page.route('**/api/v1/auth/logout', (r) => {
    logout = true;
    return r.fulfill({ status: 204 });
  });
  await ingresar(page);
  await expect(page).toHaveURL(/\/cambiar-clave/);
  await page.getByRole('button', { name: /cerrar sesión/i }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(logout).toBe(true);
});
