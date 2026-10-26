import { expect, test } from '@playwright/test';
import { iniciarSesion, USUARIOS_POR_ROL, vigilarConsola } from './utilidades';

// SDD OBS-T1 (#3 del tutor): Kardex registra un requisito y le da al estudiante un comprobante de recepción; el
// estudiante lo ve en "Mis entregas" con el mismo N.º.

test('Kardex registra un requisito, imprime el comprobante y el estudiante lo ve en Mis entregas', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, USUARIOS_POR_ROL.KARDEX);
  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await page.getByText('Juan Carlos Mamani Condori').first().click();
  await page.getByRole('tab', { name: 'Requisitos', exact: true }).click();
  await page
    .getByRole('button', { name: /^Registrar / })
    .first()
    .click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Estado').selectOption('COMPLETO');
  await dialogo.getByLabel(/^Fecha/).fill('2026-10-26');
  await dialogo.getByLabel('N.º de documento').fill('DOC-77');
  await dialogo.getByRole('button', { name: 'Guardar' }).click();

  await page.getByRole('tab', { name: 'Entregas' }).click();
  const fila = page.getByRole('row', { name: /Recibido/ });
  const nro = (await fila.getByRole('button', { name: /^REC-\d{6}$/ }).textContent())!.trim();
  await fila.getByRole('button', { name: nro }).click();
  await expect(page.getByRole('dialog', { name: 'Comprobante de recepción' })).toBeVisible();

  // Al imprimir sale solo el comprobante: la hoja del folder de la cabecera queda fuera.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.zona-prioritaria').getByText('DOC-77')).toBeVisible();
  await expect(page.getByText('Documentación existente en folder personal', { exact: false })).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page
    .getByRole('dialog', { name: 'Comprobante de recepción' })
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();

  await page.getByLabel(/Ver como/).selectOption({ label: 'Estudiante' });
  await page.getByRole('link', { name: 'Mi file académico' }).first().click();
  await page.getByRole('tab', { name: 'Mis entregas' }).click();
  await expect(page.getByRole('button', { name: nro })).toBeVisible();
  expect(problemas).toEqual([]);
});
