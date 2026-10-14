import { expect, test, type Page } from '@playwright/test';

const KARDEX = {
  accessToken: 'jwt-de-prueba',
  expiraEn: '2099-01-01T00:00:00.000Z',
  usuario: {
    id: 1,
    usuario: 'kardex',
    nombre: 'Ana Kardex',
    rol: 'KARDEX',
    sedeId: 1,
    activo: true,
    debeCambiarPassword: false,
    ultimoAcceso: null,
  },
};

const PERMISOS_KARDEX = {
  rol: 'KARDEX',
  permisos: [
    { recurso: 'usuarios', accion: 'leer' },
    { recurso: 'auditoria', accion: 'leer' },
    { recurso: 'files', accion: 'leer' },
  ],
};

async function entrar(page: Page) {
  await page.route('**/api/v1/auth/login', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(KARDEX) }),
  );
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill('kardex');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-1234');
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
  await expect(page).toHaveURL(/\/kardex$/);
}

/** Navega dentro de la SPA sin recargar (al recargar se pierde el token en memoria). */
const irA = (page: Page, ruta: string) =>
  page.evaluate((r) => {
    history.pushState({}, '', r);
    dispatchEvent(new PopStateEvent('popstate'));
  }, ruta);

test('con VITE_USAR_API=auth el menú sale de GET /auth/mis-permisos (SDD S1.11 §2.3)', async ({ page }) => {
  let autorizacion: string | undefined;
  await page.route('**/api/v1/auth/mis-permisos', async (r) => {
    autorizacion = r.request().headers()['authorization'];
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PERMISOS_KARDEX) });
  });
  await entrar(page);

  const menu = page.getByRole('navigation').getByRole('link');
  await expect(menu).toHaveText(['Inicio', 'Files académicos', 'Usuarios', 'Bitácora', 'Mi perfil']);
  expect(autorizacion).toBe('Bearer jwt-de-prueba');

  // Sin `hojas-ruta/editar` en la respuesta, Revisión de trámites es 403 aunque el rol sea KARDEX.
  await irA(page, '/revision');
  await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
});

test('si mis-permisos falla, se falla cerrado y Reintentar los vuelve a pedir (SDD S1.11 §2.4)', async ({ page }) => {
  let falla = true;
  await page.route('**/api/v1/auth/mis-permisos', (r) =>
    falla
      ? r.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'ERROR_INTERNO', message: 'Error interno.' } }),
        })
      : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PERMISOS_KARDEX) }),
  );
  await entrar(page);

  const menu = page.getByRole('navigation').getByRole('link');
  await expect(menu).toHaveText(['Inicio', 'Mi perfil']);
  await irA(page, '/usuarios');
  await expect(page.getByText('No se pudieron cargar tus permisos.')).toBeVisible();

  falla = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('heading', { name: 'Usuarios' }).first()).toBeVisible();
  await expect(menu.filter({ hasText: 'Bitácora' })).toBeVisible();
});
