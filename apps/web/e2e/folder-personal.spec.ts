import { expect, test } from '@playwright/test';
import { iniciarSesion, USUARIOS_POR_ROL, vigilarConsola } from './utilidades';

// DEC-062: el estudiante ve la hoja "Documentación existente en folder personal" con Sí o No en cada requisito, según
// lo que Kardex registró, y la imprime en el formato de papel.

test('el estudiante ve su hoja del folder con Sí y No, y la imprime en el formato de Kardex', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, USUARIOS_POR_ROL.ESTUDIANTE);
  await page.getByRole('link', { name: 'Mi file académico' }).click();
  await expect(page.getByRole('tab', { name: 'Hoja del folder' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(/Tienes \d+ de \d+ documentos obligatorios/)).toBeVisible();
  // Lo que no le corresponde lleva la aclaración de la hoja y queda sin marca.
  const libreta = page.getByRole('row', { name: /libreta militar \(varones\)/i });
  await expect(libreta.getByLabel('Sí')).toHaveCount(0);
  await expect(libreta.getByLabel('No')).toHaveCount(0);

  // Al imprimir solo queda la hoja de papel, con su título y las firmas.
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('heading', { name: /Documentación existente en folder personal/i })).toBeVisible();
  await expect(page.getByText('Uso exclusivo de Archivo Kardex', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir requisitos' })).toBeHidden();
  expect(problemas).toEqual([]);
});
