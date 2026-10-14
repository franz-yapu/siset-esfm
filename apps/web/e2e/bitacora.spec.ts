import { expect, test, type Page } from '@playwright/test';
import { CLAVE_DEMO, iniciarSesion, vigilarConsola } from './utilidades';

// El mock vive en memoria: después del primer login todo se navega sin recargar la página.

const irPorMenu = async (page: Page, nombre: RegExp) => {
  await page.getByRole('link', { name: nombre }).first().click();
};

const cerrarSesion = async (page: Page) => {
  await page.getByRole('button', { name: 'Menú de usuario' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
};

const ingresarSinRecargar = async (page: Page, usuario: string) => {
  await page.getByLabel('CI o usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(CLAVE_DEMO);
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
};

test.describe('P-48 bitácora en modo mock (SDD S6.5 §4)', () => {
  test('Kardex ve el login y la edición hechos por otro usuario', async ({ page }) => {
    const problemas = vigilarConsola(page);

    // SEC_DIR inicia sesión y recibe un pase (cambio de estado de una hoja de ruta).
    await iniciarSesion(page, 'secdir');
    await irPorMenu(page, /bandeja de pases/i);
    await page.getByRole('button', { name: 'Recibir', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Recibir', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await cerrarSesion(page);

    // Kardex abre la bitácora y filtra por ese usuario.
    await ingresarSinRecargar(page, 'kardex');
    await irPorMenu(page, /^bitácora$/i);
    await expect(page.getByText('Registro de solo lectura. No se puede modificar ni borrar.')).toBeVisible();
    await page.getByRole('combobox', { name: 'Usuario' }).fill('Rosa');
    await page.getByRole('option', { name: /Rosa Choque Apaza/ }).click();
    await expect(page).toHaveURL(/usuarioId=2/);

    const filas = page.locator('table tbody tr');
    await expect(filas.filter({ hasText: 'Cierre de sesión' }).first()).toBeVisible();
    await expect(filas.filter({ hasText: 'Inicio de sesión' }).first()).toBeVisible();
    const cambio = filas.filter({ hasText: 'Cambio de estado' }).first();
    await expect(cambio).toBeVisible();

    // "Ver detalle" muestra antes y después, con el cambio resaltado.
    await cambio.getByRole('button', { name: 'Ver detalle' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Antes', { exact: true })).toBeVisible();
    await expect(modal.locator('tr[data-cambio]').filter({ hasText: 'estado' }).first()).toBeVisible();
    await page.keyboard.press('Escape');

    expect(problemas).toEqual([]);
  });

  test('clic en "Registro afectado" muestra su historial y "atrás" vuelve al filtro anterior', async ({ page }) => {
    const problemas = vigilarConsola(page);
    await iniciarSesion(page, 'kardex');
    await page.goto('/bitacora?modulo=FILES');
    await expect(page.getByLabel('Módulo')).toHaveValue('FILES');

    const registro = page
      .locator('table tbody tr')
      .first()
      .getByRole('button', { name: /^File / });
    const texto = (await registro.textContent()) ?? '';
    await registro.click();
    await expect(page).toHaveURL(/entidad=file&entidadId=/);
    await expect(page.getByText(`Historial de: ${texto}`)).toBeVisible();
    for (const celda of await page
      .locator('table tbody tr')
      .getByRole('button', { name: /^File / })
      .all()) {
      await expect(celda).toHaveText(texto);
    }

    await page.goBack();
    await expect(page).not.toHaveURL(/entidad=/);
    await expect(page.getByText(/Historial de:/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/\/bitacora$/);
    expect(problemas).toEqual([]);
  });
});
