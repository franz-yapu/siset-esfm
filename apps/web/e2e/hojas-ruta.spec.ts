import { expect, test } from '@playwright/test';
import { iniciarSesion, vigilarConsola } from './utilidades';

// P-30 y P-31 en la demo (SDD S3.8-S3.9 §4): flujo de Secretaría de Dirección. El mock vive en memoria: se navega
// con el menú y los enlaces, sin recargar.

test('SEC_DIR registra un historial con valorado, avisa a Kardex y lo ve en la lista y el detalle', async ({
  page,
}) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'secdir');
  await page.getByRole('link', { name: 'Hojas de ruta' }).first().click();
  await expect(page.getByRole('heading', { name: 'Hojas de ruta' })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva hoja de ruta' }).click();

  await page.getByLabel('CI o nombre del egresado').fill('Marco');
  await page.getByRole('listbox').getByRole('button').first().click();
  await page.getByLabel('Tipo de trámite').selectOption({ label: 'Historial académico' });
  await page.getByRole('button', { name: 'Registrar y avisar a Kardex' }).click();
  await expect(page.getByText('Ingresa el N.º de valorado canjeado')).toBeVisible();
  await page.getByLabel('N.º de valorado').fill('004522');
  await page.getByRole('button', { name: 'Registrar y avisar a Kardex' }).click();

  const dialogo = page.getByRole('dialog', { name: 'Trámite registrado' });
  await expect(dialogo).toBeVisible();
  const nro = (await dialogo.getByText(/^HR-\d{4}-\d{6}$/).textContent())!;
  await dialogo.getByRole('button', { name: 'Ver trámite' }).click();

  await expect(page.getByRole('heading', { name: nro })).toBeVisible();
  await expect(page.getByText('Avisado a Kardex').first()).toBeVisible();
  await expect(page.getByText('Recibido').first()).toBeVisible();

  await page.getByRole('link', { name: 'Hojas de ruta' }).first().click();
  await page.getByLabel('Buscar').fill(nro);
  await expect(page.getByRole('row', { name: new RegExp(nro) })).toBeVisible();

  // Un certificado no lleva valorado.
  await page.getByRole('button', { name: 'Nueva hoja de ruta' }).click();
  await page.getByLabel('CI o nombre del egresado').fill('Elena');
  await page.getByRole('listbox').getByRole('button').first().click();
  await page.getByLabel('Tipo de trámite').selectOption({ label: 'Certificado de notas de años pasados' });
  await expect(page.getByLabel('N.º de valorado')).toHaveCount(0);
  await page.getByRole('button', { name: 'Solo registrar' }).click();
  await expect(page.getByRole('dialog', { name: 'Trámite registrado' })).toBeVisible();
  expect(problemas).toEqual([]);
});

test('el Coordinador ve en su inicio lo que espera su firma y lo firma desde el detalle', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'coordinador');
  const tabla = page.getByRole('table').first();
  await expect(page.getByText('Esperan tu firma').first()).toBeVisible();
  await tabla.getByRole('button', { name: 'Firmar' }).first().click();
  await page.getByRole('button', { name: 'Firmar', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Firmado por el Coordinador').first()).toBeVisible();
  expect(problemas).toEqual([]);
});

test('Kardex recoge un trámite avisado desde su inicio', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'kardex');
  await page.getByText('Trámites por recoger').click();
  await expect(page).toHaveURL(/estado=AVISADO_KARDEX/);
  await page.getByRole('row').nth(1).click();
  await page.getByRole('button', { name: 'Registrar que Kardex lo recogió' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('En impresión').first()).toBeVisible();
  expect(problemas).toEqual([]);
});
