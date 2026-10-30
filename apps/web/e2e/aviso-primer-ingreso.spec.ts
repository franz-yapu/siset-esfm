import { expect, test } from '@playwright/test';

// DEC-067: el aviso del primer ingreso flota al entrar al login; cerrarlo lo esconde hasta volver a entrar o tocar el
// ícono de ajustes; "No volver a mostrar" lo esconde para siempre en este navegador.

// El resto de la suite lo trae oculto (playwright.config.ts): aquí, un navegador limpio.
test.use({ storageState: { cookies: [], origins: [] } });

const aviso = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: '¿Eres estudiante y entras por primera vez?' });

test('sale al entrar, se cierra, vuelve con el ícono de ajustes y al volver a entrar', async ({ page }) => {
  await page.goto('/login');
  await expect(aviso(page)).toContainText('15-03-2004');
  // No bloquea: se puede escribir con el aviso abierto.
  await page.getByLabel('CI o usuario').fill('1234567');

  await aviso(page).getByRole('button', { name: 'Cerrar el aviso' }).click();
  await expect(aviso(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Ayuda para el primer ingreso' }).click();
  await expect(aviso(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aviso(page)).toHaveCount(0);

  await page.reload();
  await expect(aviso(page)).toBeVisible();
});

test('"No volver a mostrar" lo esconde al volver a entrar; el ícono lo sigue abriendo', async ({ page }) => {
  await page.goto('/login');
  await aviso(page).getByLabel('No volver a mostrar').check();
  await aviso(page).getByRole('button', { name: 'Entendido' }).click();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(aviso(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Ayuda para el primer ingreso' }).click();
  await expect(aviso(page)).toBeVisible();
  // Desmarcarlo y cerrar lo devuelve a la normalidad.
  await aviso(page).getByLabel('No volver a mostrar').uncheck();
  await aviso(page).getByRole('button', { name: 'Entendido' }).click();
  await page.reload();
  await expect(aviso(page)).toBeVisible();
});
