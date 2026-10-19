import { expect, test } from '@playwright/test';
import { API_E2E, credenciales, entrarComo, irA, llenarLogin, tokenDe } from './utilidades';

/** Sesión contra la API real (SDD S1.14 §2.5): la restaura el refresh y la cierra el logout (S1.10). */
const MENSAJE_GENERICO = 'CI o contraseña incorrectos.';

test.describe('E5 y E7 · sesión que termina', () => {
  test('E5 · sin la cookie del refresh, recargar lleva a /login', async ({ page, context }) => {
    await entrarComo(page, 'SEC_DIR');
    await irA(page, '/files');
    await context.clearCookies();
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('E7 · después del logout, ni la URL directa ni "Atrás" muestran lo protegido', async ({ page }) => {
    await entrarComo(page, 'SEC_DIR');
    await irA(page, '/files');
    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/files');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('E8 y E9 · login fallido y bloqueo', () => {
  test('E8 · un CI inexistente: mensaje genérico y sigue en /login', async ({ page }) => {
    await page.goto('/login');
    await llenarLogin(page, '8899999', 'cualquiera.1');
    await expect(page.getByRole('alert')).toContainText(MENSAJE_GENERICO);
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe('cuenta que se bloquea', () => {
    test.afterAll(async ({ request }) => {
      const { ADMIN, BLOQUEO } = credenciales();
      const token = await tokenDe(request, ADMIN.usuario, ADMIN.password);
      const r = await request.post(`${API_E2E}/usuarios/${BLOQUEO.id}/desbloquear`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 422]).toContain(r.status());
    });

    test('E9 · cinco errores y luego la correcta: el mismo mensaje, sin revelar el bloqueo', async ({ page }) => {
      const { usuario, password } = credenciales().BLOQUEO;
      await page.goto('/login');
      for (let i = 0; i < 5; i++) {
        await llenarLogin(page, usuario, `${password}x`);
        await expect(page.getByRole('alert')).toContainText(MENSAJE_GENERICO);
      }
      await llenarLogin(page, usuario, password);
      await expect(page.getByRole('alert')).toContainText(MENSAJE_GENERICO);
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});

test('E10 · recargar dos veces seguidas sin esperar no cierra la sesión ni registra reuso (S1.15)', async ({
  page,
  request,
}) => {
  const { ADMIN, SEC_COORD } = credenciales();
  const token = await tokenDe(request, ADMIN.usuario, ADMIN.password);
  const reusos = async () => {
    const r = await request.get(`${API_E2E}/auditoria`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { accion: 'REUSO_SESION', usuarioId: SEC_COORD.id },
    });
    expect(r.status()).toBe(200);
    return ((await r.json()) as { total: number }).total;
  };
  const antes = await reusos();
  await entrarComo(page, 'SEC_COORD');

  // Navegar, recargar y volver a navegar sin esperar a que termine la restauración: con DEC-014 #3 sin
  // gracia, esto perdía la cookie rotada y cerraba la sesión (reproducido en 2 de 4 corridas).
  for (const ruta of ['/files', '/usuarios', '/files']) {
    await page.goto(ruta);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${ruta}$`));
  }
  await expect(page.getByRole('complementary', { name: 'Menú principal' })).toBeVisible();
  expect(await reusos()).toBe(antes);
});
