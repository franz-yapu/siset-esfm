import { expect, test } from '@playwright/test';
import { iniciarSesion, vigilarConsola } from './utilidades';

// P-15 en la demo (SDD S1.12 §4): los files salen de filesService y los trámites de hojasRutaService (DEC-037).

test('el inicio de Kardex muestra los files, los bloqueados y los en rojo, y lleva a la búsqueda filtrada', async ({
  page,
}) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'kardex');
  const main = page.getByRole('main');
  await expect(main.getByRole('link', { name: /^En rojo/ })).toBeVisible();
  // El camino de los trámites en Kardex (por recoger, en impresión, por remitir).
  await expect(main.getByRole('region', { name: 'Trámites en Kardex' }).getByText('Por recoger')).toBeVisible();
  await expect(main.getByRole('button', { name: 'Buscar file' })).toBeVisible();

  await main.getByRole('link', { name: /^En rojo/ }).click();
  await expect(page).toHaveURL(/\/files\?semaforo=ROJO/);
  await expect(page.getByLabel('Semáforo')).toHaveValue('ROJO');
  expect(problemas).toEqual([]);
});
