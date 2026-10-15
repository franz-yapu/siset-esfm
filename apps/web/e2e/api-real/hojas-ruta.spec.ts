import { expect, test } from '@playwright/test';
import { entrarComo, irA } from './utilidades';

/**
 * Hojas de ruta contra la API real (SDD S3.8-S3.9 §4): Kardex registra un egresado, SEC_DIR (Calahumana) registra el
 * trámite y avisa a Kardex, y Kardex (Ancocagua) registra que lo recogió. Datos únicos por corrida.
 */
const sufijo = Date.now().toString().slice(-7);
const CI = `7${sufijo}`;
let nro = '';

test.describe.serial('hojas de ruta', () => {
  test('Kardex registra un egresado', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files/nuevo');
    await page.getByLabel('CI', { exact: true }).fill(CI);
    await page.getByLabel('Código de estudiante').fill(`HR-E2E-${sufijo}`);
    await page.getByLabel('Nombres').fill('Egresada');
    await page.getByLabel('Apellido paterno').fill('Trámite');
    await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
    await page.getByLabel('Año de ingreso').fill('2019');
    await page.getByLabel('Condición').selectOption('EGRESADO');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'Egresada Trámite' })).toBeVisible();
  });

  test('SEC_DIR registra el historial y avisa a Kardex', async ({ page }) => {
    await entrarComo(page, 'SEC_DIR');
    await irA(page, '/hojas-ruta/nueva');
    await page.getByLabel('CI o nombre del egresado').fill(CI);
    await page.getByRole('listbox').getByRole('button').first().click();
    await page.getByLabel('Tipo de trámite').selectOption({ label: 'Historial académico' });
    await page.getByLabel('N.º de valorado').fill('009001');
    await page.getByRole('button', { name: 'Registrar y avisar a Kardex' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Trámite registrado' });
    nro = (await dialogo.getByText(/^HR-\d{4}-\d{6}$/).textContent())!;
    await dialogo.getByRole('button', { name: 'Ver trámite' }).click();
    await expect(page.getByRole('heading', { name: nro })).toBeVisible();
    await expect(page.getByText('Avisado a Kardex').first()).toBeVisible();
  });

  test('Kardex registra que lo recogió; la línea de tiempo tiene 3 pasos', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, `/hojas-ruta/${nro}`);
    await page.getByRole('button', { name: 'Registrar que Kardex lo recogió' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('En impresión').first()).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /Recibido|Avisado a Kardex|En impresión/ })).toHaveCount(
      3,
    );
  });
});
