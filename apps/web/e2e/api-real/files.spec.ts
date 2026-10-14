import { expect, test } from '@playwright/test';
import { entrarComo, irA } from './utilidades';

/**
 * E11 · Files contra la API real (SDD S2.9-S2.10 §4): Kardex registra un file, lo busca, lo edita y lo ve en
 * el historial; SEC_DIR lo ve sin poder editar (DEC-015). La base de E2E sobrevive entre corridas: CI y
 * código únicos por corrida.
 */
const sufijo = Date.now().toString().slice(-7);
const CI = `8${sufijo}`;
const CODIGO = `E2E-${sufijo}`;

test.describe.serial('E11 · files', () => {
  test('Kardex registra, busca y edita un file; queda en el historial', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files/nuevo');
    await page.getByLabel('CI', { exact: true }).fill(CI);
    await page.getByLabel('Código de estudiante').fill(CODIGO);
    await page.getByLabel('Nombres').fill('Prueba');
    await page.getByLabel('Apellido paterno').fill('Archivo');
    await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
    await page.getByLabel('Año de ingreso').fill('2024');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'Prueba Archivo' })).toBeVisible();
    await expect(page.getByText(/se habilitan en una próxima versión/)).toBeVisible();

    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await page.getByRole('row', { name: /Prueba Archivo/ }).click();
    await page.getByLabel('Celular').fill('70000001');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Datos actualizados')).toBeVisible();

    await page.getByRole('tab', { name: 'Historial' }).click();
    await expect(page.getByRole('row', { name: /Edición/ }).first()).toBeVisible();
  });

  test('SEC_DIR ve el file, sin "Nuevo file" ni "Guardar"', async ({ page }) => {
    await entrarComo(page, 'SEC_DIR');
    await irA(page, '/files');
    await expect(page.getByRole('button', { name: 'Nuevo file' })).toHaveCount(0);
    await page.getByLabel('Buscar').fill(CI);
    await page.getByRole('row', { name: /Prueba Archivo/ }).click();
    await expect(page.getByRole('heading', { name: 'Prueba Archivo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0);
    await expect(page.getByLabel('Celular')).toBeDisabled();
  });
});
