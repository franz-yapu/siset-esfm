import { expect, test, type Page, type Route } from '@playwright/test';

// Proyecto `api` (VITE_USAR_API=auth,bitacora): la API se simula con page.route (SDD S6.5 §4).

const KARDEX = {
  accessToken: 'jwt-de-prueba',
  expiraEn: '2099-01-01T00:00:00.000Z',
  usuario: {
    id: 1,
    usuario: '1234567',
    nombre: 'María Quispe Mamani',
    rol: 'KARDEX',
    sedeId: 2,
    activo: true,
    debeCambiarPassword: false,
    ultimoAcceso: null,
  },
};

const evento = (id: number, p: Record<string, unknown>) => ({
  id,
  fecha: '2026-10-20T14:03:11.000Z',
  usuario: { id: 3, usuario: '4567890', nombre: 'Ana Ticona Laura' },
  accion: 'LOGIN',
  modulo: 'SEGURIDAD',
  entidad: 'usuario',
  entidadId: '3',
  antes: null,
  despues: null,
  ip: '198.51.100.4',
  userAgent: 'Mozilla/5.0',
  ...p,
});

const responder = (ruta: Route, status: number, cuerpo: unknown) =>
  ruta.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

/** Entra como Kardex y abre la bitácora por el menú (sin recargar: la sesión real llega con S1.10). */
async function entrarABitacora(page: Page) {
  await page.route('**/api/v1/auth/login', (r) => responder(r, 200, KARDEX));
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill('1234567');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-1234');
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page
    .getByRole('link', { name: /^bitácora$/i })
    .first()
    .click();
}

test('P-48 en modo API: filtros y página van a GET /auditoria y se muestran en español', async ({ page }) => {
  const pedidos: URLSearchParams[] = [];
  await page.route('**/api/v1/auditoria?*', (r) => {
    const q = new URL(r.request().url()).searchParams;
    pedidos.push(q);
    const pagina = Number(q.get('pagina'));
    return responder(r, 200, {
      datos:
        pagina === 2
          ? [evento(10, { accion: 'LOGOUT' })]
          : [
              evento(12, {
                usuario: null,
                accion: 'LOGIN_FALLIDO',
                entidadId: '9999999',
                despues: { motivo: 'CI_INEXISTENTE' },
              }),
              evento(11, {
                accion: 'EDITAR',
                entidadId: '8',
                antes: { rol: 'SEC_DIR' },
                despues: { rol: 'SEC_COORD' },
              }),
            ],
      pagina,
      porPagina: 50,
      total: 51,
    });
  });

  await entrarABitacora(page);
  await expect(page.getByText('51 registros')).toBeVisible();
  await expect(page.getByText('Sin usuario').first()).toBeVisible();
  await expect(page.getByText('Intento de ingreso fallido · CI no registrado').first()).toBeVisible();
  await expect(page.getByText('CI intentado: 9999999').first()).toBeVisible();
  await expect(page.getByText('20/10/2026 10:03:11').first()).toBeVisible();

  await page.getByLabel('Módulo').selectOption('SEGURIDAD');
  await expect.poll(() => pedidos.at(-1)?.toString()).toBe('modulo=SEGURIDAD&pagina=1&porPagina=50');

  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect.poll(() => pedidos.at(-1)?.get('pagina')).toBe('2');
  await expect(page.locator('table tbody').getByText('Cierre de sesión')).toBeVisible();
});

test('P-48 en modo API: un 403 muestra el error y "Reintentar" vuelve a pedir', async ({ page }) => {
  let llamadas = 0;
  await page.route('**/api/v1/auditoria?*', (r) => {
    llamadas += 1;
    return responder(r, 403, { error: { code: 'PROHIBIDO', message: 'No tiene permiso para esta acción.' } });
  });

  await entrarABitacora(page);
  await expect(page.getByText('No se pudo cargar la bitácora')).toBeVisible();
  await expect(page.getByText('No tiene permiso para esta acción.')).toBeVisible();
  const antes = llamadas;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect.poll(() => llamadas).toBeGreaterThan(antes);
});
