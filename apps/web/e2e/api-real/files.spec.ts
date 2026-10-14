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
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page.getByRole('row', { name: new RegExp(`^${CI} `) }).click();
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
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page.getByRole('row', { name: new RegExp(`^${CI} `) }).click();
    await expect(page.getByRole('heading', { name: 'Prueba Archivo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0);
    await expect(page.getByLabel('Celular')).toBeDisabled();
  });

  test('E12 · Kardex bloquea y desbloquea el file; el historial muestra los dos eventos (S2.6)', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page.getByRole('row', { name: new RegExp(`^${CI} `) }).click();

    await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Bloquear file' });
    await modal.getByLabel('Motivo').fill('Permiso obligatorio por reprobación, prueba E2E');
    await modal.getByRole('button', { name: 'Bloquear', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Desbloquear', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    const otro = page.getByRole('dialog', { name: 'Desbloquear file' });
    await otro.getByLabel('Número de resolución').fill('RA-E2E/2026');
    await otro.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Historial' }).click();
    await expect(page.getByRole('row', { name: /Bloqueo del file/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Desbloqueo del file/ })).toBeVisible();
  });

  test('E13 · Kardex completa TACFI de 1.º año; COORDINADOR lo ve sin poder editar (S2.4)', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page.getByRole('row', { name: new RegExp(`^${CI} `) }).click();
    await page.getByRole('tab', { name: 'Requisitos' }).click();
    const tarjeta = page.getByRole('article', { name: 'TACFI artístico de 1.º año' });
    await tarjeta.getByRole('button', { name: 'Registrar' }).click();
    const modal = page.getByRole('dialog', { name: 'TACFI artístico de 1.º año' });
    await modal.getByLabel('Fecha').fill('2025-10-20');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta.getByText(/Registró:/)).toBeVisible();

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await entrarComo(page, 'COORDINADOR');
    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page.getByRole('row', { name: new RegExp(`^${CI} `) }).click();
    await page.getByRole('tab', { name: 'Requisitos' }).click();
    const vista = page.getByRole('article', { name: 'TACFI artístico de 1.º año' });
    await expect(vista.getByText('Completo')).toBeVisible();
    await expect(vista.getByRole('button')).toHaveCount(0);
  });
});
