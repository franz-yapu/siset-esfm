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
      const { KARDEX, BLOQUEO } = credenciales();
      const token = await tokenDe(request, KARDEX.usuario, KARDEX.password);
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
