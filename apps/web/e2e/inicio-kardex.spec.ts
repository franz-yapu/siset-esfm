import { expect, test } from '@playwright/test';
import { iniciarSesion, vigilarConsola } from './utilidades';

// P-15 en la demo (SDD S1.12 §4): los files salen de filesService y los trámites de hojasRutaService (DEC-037).

test('el inicio de Kardex muestra los files, los bloqueados y los en rojo, y lleva a la búsqueda filtrada', async ({
  page,
}) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'kardex');
  await expect(page.getByText('Files en rojo')).toBeVisible();
  await expect(page.getByText('Trámites por recoger')).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Hojas de ruta' })).toBeVisible();

  await page.getByText('Files en rojo').click();
  await expect(page).toHaveURL(/\/files\?semaforo=ROJO/);
  await expect(page.getByLabel('Semáforo')).toHaveValue('ROJO');
  expect(problemas).toEqual([]);
});
