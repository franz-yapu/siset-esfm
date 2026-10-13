import { expect, test } from '@playwright/test';

test('con VITE_USAR_API=auth el login llama a la API y muestra su error (SDD S0.8 §2.4)', async ({ page }) => {
  let cuerpo: unknown = null;
  await page.route('**/api/v1/auth/login', async (ruta) => {
    cuerpo = ruta.request().postDataJSON();
    await ruta.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'NO_ENCONTRADO', message: 'La ruta solicitada no existe.' } }),
    });
  });

  await page.goto('/login');
  await expect(page.getByRole('button', { name: /usuarios de prueba/i })).toHaveCount(0);

  await page.getByLabel('CI o usuario').fill('1234567');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-1234');
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();

  await expect(page.getByText('La ruta solicitada no existe.')).toBeVisible();
  expect(cuerpo).toEqual({ usuario: '1234567', password: 'clave-1234' });
  await expect(page).toHaveURL(/\/login/);
});
