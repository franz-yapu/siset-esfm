import { expect, test, type Route } from '@playwright/test';

// Proyecto `api`: el inicio de Kardex pide los totales a GET /files (SDD S1.12 §2.1) y oculta lo no conectado.

const responder = (r: Route, cuerpo: unknown) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });

test('con la API, el inicio de Kardex muestra solo los indicadores de files', async ({ page }) => {
  const pedidos: URLSearchParams[] = [];
  await page.route('**/api/v1/auth/login', (r) =>
    responder(r, {
      accessToken: 'jwt',
      expiraEn: '2099-01-01T00:00:00.000Z',
      usuario: {
        id: 1,
        usuario: '1234567',
        nombre: 'María Quispe',
        rol: 'KARDEX',
        sedeId: 2,
        activo: true,
        debeCambiarPassword: false,
        ultimoAcceso: null,
      },
    }),
  );
  await page.route('**/api/v1/auth/mis-permisos', (r) =>
    responder(r, {
      rol: 'KARDEX',
      permisos: [
        { recurso: 'files', accion: 'leer' },
        { recurso: 'usuarios', accion: 'leer' },
      ],
    }),
  );
  await page.route('**/api/v1/files?*', (r) => {
    const q = new URL(r.request().url()).searchParams;
    pedidos.push(q);
    const total = q.get('bloqueado') ? 2 : q.get('semaforo') ? 3 : 152;
    return responder(r, { datos: [], pagina: 1, porPagina: Number(q.get('porPagina')), total });
  });
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill('1234567');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-1234');
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();

  await expect(page.getByText('152')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /^En rojo/ })).toBeVisible();
  await expect(page.getByText('Trámites en revisión')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('link', { name: 'Revisión de trámites' })).toHaveCount(0);
  expect(pedidos.some((q) => q.get('bloqueado') === 'true')).toBe(true);
  expect(pedidos.some((q) => q.get('semaforo') === 'ROJO')).toBe(true);
});
