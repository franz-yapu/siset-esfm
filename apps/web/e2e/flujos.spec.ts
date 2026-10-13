import { expect, test } from '@playwright/test';
import { iniciarSesion, vigilarConsola } from './utilidades';

test.describe('flujos interactivos (S0.3)', () => {
  test('sin sesión redirige al login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login, recarga con sesión, lista con filtro y modal con Esc', async ({ page }) => {
    const problemas = vigilarConsola(page);
    await iniciarSesion(page, 'kardex');
    await expect(page).toHaveURL(/\/kardex/);

    await page.reload();
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto('/files');
    const filas = page.locator('table tbody tr');
    await expect(filas.first()).toBeVisible();
    const total = await filas.count();
    await page
      .getByPlaceholder(/buscar|ci|nombre/i)
      .first()
      .fill('zzzz-sin-resultados');
    await expect.poll(() => filas.count()).not.toBe(total);

    await page.goto('/usuarios');
    await page.getByRole('button', { name: /nuevo usuario/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    expect(problemas).toEqual([]);
  });
});
