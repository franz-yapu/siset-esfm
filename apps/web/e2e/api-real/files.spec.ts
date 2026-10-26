import { expect, test } from '@playwright/test';
import { llenarBloqueo } from '../utilidades';
import { entrarComo, irA, vistaDenegada } from './utilidades';

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
    await page.getByLabel('Modalidad de ingreso').selectOption('A');
    await page.getByLabel('Año de ingreso').fill('2024');
    // DEC-064 #4: obligatoria para un estudiante, es su contraseña inicial.
    await page.getByLabel('Fecha de nacimiento').fill('2004-05-10');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'Prueba Archivo' })).toBeVisible();
    await expect(page.getByText(/se habilitan en una próxima versión/)).toBeVisible();

    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page
      .getByRole('row')
      .filter({ hasText: `CI ${CI}` })
      .click();
    await page.getByLabel('Celular').fill('70000001');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Datos actualizados')).toBeVisible();

    // El historial es de la bitácora, que mira el Administrador (DEC-054): Kardex ya no tiene la pestaña.
    await expect(page.getByRole('tab', { name: 'Historial' })).toHaveCount(0);
  });

  test('SEC_DIR no ve files: ni en el menú ni por URL (DEC-054)', async ({ page }) => {
    await entrarComo(page, 'SEC_DIR');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Files académicos' })).toHaveCount(0);
    await irA(page, '/files');
    await expect(vistaDenegada(page)).toBeVisible();
  });

  test('E12 · Kardex bloquea con resolución y PDF, lo ve y desbloquea; la bitácora del file muestra los dos eventos (DEC-049)', async ({
    page,
    browser,
  }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page
      .getByRole('row')
      .filter({ hasText: `CI ${CI}` })
      .click();

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

    // El Administrador lo ve en la bitácora (DEC-054), en otra ventana para no cerrar la sesión de Kardex.
    const fileId = /\/files\/(\d+)/.exec(page.url())![1];
    const admin = await (await browser.newContext()).newPage();
    await entrarComo(admin, 'ADMIN');
    await irA(admin, `/bitacora?entidad=file_academico&entidadId=${fileId}`);
    await expect(admin.getByRole('row', { name: /Bloqueo del file/ })).toBeVisible();
    await expect(admin.getByRole('row', { name: /Desbloqueo del file/ })).toBeVisible();
    await admin.context().close();
  });

  test('E13 · Kardex completa el TACFI Artístico I con curso y entidad; COORDINADOR lo ve sin poder editar (DEC-051)', async ({
    page,
    browser,
  }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/files');
    await page.getByLabel('Buscar').fill(CI);
    await expect(page).toHaveURL(new RegExp(`texto=${CI}`));
    await page
      .getByRole('row')
      .filter({ hasText: `CI ${CI}` })
      .click();
    await page.getByRole('tab', { name: 'Requisitos' }).click();
    const tacfi = 'Certificado legalizado de TACFI – Artístico I';
    const tarjeta = page.getByRole('listitem', { name: tacfi, exact: true });
    await tarjeta.getByRole('button', { name: `Registrar ${tacfi}`, exact: true }).click();
    const modal = page.getByRole('dialog', { name: tacfi });
    await modal.getByLabel('Nombre del curso').fill('Danza folklórica (E2E)');
    await modal.getByLabel('Entidad emisora').fill('ESFM (E2E)');
    await modal.getByLabel('Fecha en que lo tomó').fill('2025-10-20');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(tarjeta.getByText(/Registró:/)).toBeVisible();

    // El Coordinador en otra ventana, sin cerrar la sesión de Kardex: un logout con un refresh en vuelo cuenta como
    // reuso y cierra TODAS las sesiones de Kardex, también las de las pruebas en paralelo (SDD S1.5 §2.2, DEC-047).
    const coordinador = await (await browser.newContext()).newPage();
    await entrarComo(coordinador, 'COORDINADOR');
    await irA(coordinador, '/files');
    await coordinador.getByLabel('Buscar').fill(CI);
    await expect(coordinador).toHaveURL(new RegExp(`texto=${CI}`));
    await coordinador
      .getByRole('row')
      .filter({ hasText: `CI ${CI}` })
      .click();
    await coordinador.getByRole('tab', { name: 'Requisitos' }).click();
    const vista = coordinador.getByRole('listitem', { name: tacfi, exact: true });
    await expect(vista.getByText('Completo')).toBeVisible();
    await expect(vista.getByRole('button')).toHaveCount(0);
    await coordinador.context().close();
  });
});
