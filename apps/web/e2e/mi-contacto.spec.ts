import { expect, test } from '@playwright/test';
import { iniciarSesion, USUARIOS_POR_ROL, vigilarConsola } from './utilidades';

// ADR-0013: el estudiante cambia su correo, celular y dirección en "Mis datos"; el resto de su file es de solo lectura.

test('el estudiante cambia su contacto en Mis datos y Kardex lo ve en el file', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, USUARIOS_POR_ROL.ESTUDIANTE);
  await page.getByRole('link', { name: 'Mi file académico' }).click();
  await page.getByRole('tab', { name: 'Mis datos' }).click();
  await expect(page.getByRole('button', { name: 'Guardar mis datos' })).toBeDisabled();
  await page.getByLabel('Dirección').fill('Calle Bolívar 123, Pucarani');
  await page.getByLabel('Celular').fill('77712345');
  await page.getByRole('button', { name: 'Guardar mis datos' }).click();
  await expect(page.getByText('Tus datos se guardaron')).toBeVisible();
  // Sin campos para el nombre ni el CI: los cambia Kardex.
  await expect(page.getByLabel('Nombres')).toHaveCount(0);

  await page.getByLabel(/Ver como/).selectOption({ label: 'Kardex' });
  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await page.getByText('Juan Carlos Mamani Condori').first().click();
  await expect(page.getByLabel('Dirección')).toHaveValue('Calle Bolívar 123, Pucarani');
  await expect(page.getByLabel('Celular')).toHaveValue('77712345');
  expect(problemas).toEqual([]);
});
