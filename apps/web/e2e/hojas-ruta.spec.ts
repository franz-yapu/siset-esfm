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
  await page.getByRole('listbox').getByRole('button').filter({ hasText: 'Marco' }).first().click();
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
  // La búsqueda pasa a la URL tras 300 ms: si se navega antes, ese cambio pendiente devuelve a la lista.
  await expect(page).toHaveURL(/texto=/);

  // Un certificado no lleva valorado.
  await page.getByRole('button', { name: 'Nueva hoja de ruta' }).click();
  await page.getByLabel('CI o nombre del egresado').fill('Elena');
  await page.getByRole('listbox').getByRole('button').filter({ hasText: 'Elena' }).first().click();
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
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Por recoger/ })
    .click();
  // La bandeja "Recojo y remisión" (DEC-041): elegir el trámite abre el panel con el paso de Kardex.
  await expect(page).toHaveURL(/\/revision$/);
  await expect(page.getByRole('tab', { name: /Por recoger/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('row').nth(1).click();
  await page.getByRole('button', { name: 'Registrar que Kardex lo recogió' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText(/: En impresión$/)).toBeVisible();
  expect(problemas).toEqual([]);
});

test('seguimiento público con el QR: N.º + CI muestran el avance; un CI equivocado, el mensaje genérico', async ({
  page,
}) => {
  const problemas = vigilarConsola(page);
  const nro = `HR-${new Date().getFullYear()}-000001`;
  await page.goto(`/seguimiento?hr=${nro}`);
  await page.getByLabel('CI del titular').fill('1111111');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText('No encontramos un trámite con esos datos.')).toBeVisible();
  await page.getByLabel('CI del titular').fill('6076543');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect(page.getByText('Elena', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Recibido').first()).toBeVisible();
  expect(problemas).toEqual([]);
});

test('seguimiento sin QR: el N.º se escribe tecla por tecla sin que el foco salte al CI', async ({ page }) => {
  const problemas = vigilarConsola(page);
  const nro = `HR-${new Date().getFullYear()}-000001`;
  await page.goto('/seguimiento');
  const campo = page.getByLabel('N.º de hoja de ruta');
  await expect(campo).toBeFocused();
  await page.keyboard.type(nro.toLowerCase());
  await expect(campo).toHaveValue(nro);
  await expect(campo).toBeFocused();
  await expect(page.getByLabel('CI del titular')).toHaveValue('');
  expect(problemas).toEqual([]);
});

test('SEC_DIR entrega a un familiar desde "Firma y entrega" (D-36, D-42)', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'secdir');
  await page.getByRole('link', { name: 'Firma y entrega' }).click();
  await page.getByRole('tab', { name: /Por entregar/ }).click();
  await page.getByRole('row', { name: /HR-2026-000005/ }).click();
  await page.getByRole('button', { name: 'Registrar entrega' }).click();
  const dialogo = page.getByRole('dialog', { name: /Registrar entrega/ });
  await dialogo.getByLabel('Entregado a').selectOption('Familiar');
  await dialogo.getByLabel('Parentesco', { exact: true }).selectOption('Hijo/a');
  await dialogo.getByLabel('Nombre de quien recibe').fill('Ana Tarqui');
  await dialogo.getByLabel('CI de quien recibe').fill('7788990');
  await expect(dialogo.getByRole('button', { name: 'Registrar entrega' })).toBeDisabled();
  await dialogo.getByLabel('Verifiqué el parentesco y firmó el recojo.').check();
  await dialogo.getByRole('button', { name: 'Registrar entrega' }).click();
  await expect(page.getByText('HR-2026-000005: Entregado')).toBeVisible();
  expect(problemas).toEqual([]);
});

test('Kardex devuelve un historial con observación desde Impresión (DEC-053)', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await iniciarSesion(page, 'kardex');
  await page.getByRole('link', { name: 'Impresión' }).first().click();
  await expect(page.getByRole('tab', { name: /Por imprimir/ })).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('row', { name: /Historial académico/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Devolver con observación' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Devolver con observación' });
  await expect(dialogo.getByText('No se imprime')).toBeVisible();
  await expect(dialogo.getByRole('button', { name: 'Devolver' })).toBeDisabled();
  await dialogo.getByLabel(/Observación \(obligatoria\)/).fill('La nota de 2.º año no coincide con el empaste');
  await dialogo.getByRole('button', { name: 'Devolver' }).click();
  await expect(page.getByText(/: Devuelto con observación$/)).toBeVisible();
  await page.getByRole('tab', { name: /Devueltos/ }).click();
  await expect(page.getByRole('row', { name: /Historial académico/ })).toHaveCount(1);
  expect(problemas).toEqual([]);
});
