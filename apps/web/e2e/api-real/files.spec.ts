import { expect, test } from '@playwright/test';
import { llenarBloqueo } from '../utilidades';
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

  test('E12 · Kardex bloquea con resolución y PDF, lo ve y desbloquea; el historial muestra los dos eventos (DEC-049)', async ({
    page,
  }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page.getByRole('row', { name: new RegExp(`^${CI} `) }).click();

    await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Bloquear file' });
    await llenarBloqueo(modal, { glosa: 'Licencia temporal obligatoria por reprobación, prueba E2E' });
    await modal.getByRole('button', { name: 'Bloquear', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Desbloquear', exact: true })).toBeVisible();
    await expect(page.getByText('RA-E2E/2026, del 01/10/2026')).toBeVisible();

    // El PDF se descarga con el token y abre en otra pestaña.
    const pestana = page.context().waitForEvent('page');
    await page.getByRole('button', { name: 'Ver PDF de la resolución' }).click();
    await expect.poll(async () => (await pestana).url()).toMatch(/^blob:/);
    await (await pestana).close();

    await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    const otro = page.getByRole('dialog', { name: 'Desbloquear file' });
    await otro.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Historial' }).click();
    await expect(page.getByRole('row', { name: /Bloqueo del file/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Desbloqueo del file/ })).toBeVisible();
  });

  test('E13 · Kardex completa TACFI de 1.º año; COORDINADOR lo ve sin poder editar (S2.4)', async ({
    page,
    browser,
  }) => {
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

    // El Coordinador en otra ventana, sin cerrar la sesión de Kardex: un logout con un refresh en vuelo cuenta como
    // reuso y cierra TODAS las sesiones de Kardex, también las de las pruebas en paralelo (SDD S1.5 §2.2, DEC-047).
    const coordinador = await (await browser.newContext()).newPage();
    await entrarComo(coordinador, 'COORDINADOR');
    await irA(coordinador, '/files');
    await coordinador.getByLabel('Buscar').fill(CI);
    await expect(coordinador).toHaveURL(new RegExp(`texto=${CI}`));
    await coordinador.getByRole('row', { name: new RegExp(`^${CI} `) }).click();
    await coordinador.getByRole('tab', { name: 'Requisitos' }).click();
    const vista = coordinador.getByRole('article', { name: 'TACFI artístico de 1.º año' });
    await expect(vista.getByText('Completo')).toBeVisible();
    await expect(vista.getByRole('button')).toHaveCount(0);
    await coordinador.context().close();
  });
});
