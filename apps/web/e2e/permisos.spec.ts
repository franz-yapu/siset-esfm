import { expect, test, type Page } from '@playwright/test';
import { iniciarSesion, USUARIOS_POR_ROL } from './utilidades';

/** Etiquetas del menú lateral, en orden. */
const menu = (page: Page) => page.getByRole('navigation').getByRole('link');

test.describe('rutas por rol y P-04 en modo mock (SDD S1.11 §2.4)', () => {
  test('una URL directa sin permiso muestra 403 en la misma URL', async ({ page }) => {
    await iniciarSesion(page, USUARIOS_POR_ROL.SEC_COORD);
    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
    await expect(page).toHaveURL(/\/usuarios$/);
    await page.getByRole('link', { name: 'Volver a mi inicio' }).click();
    await expect(page).toHaveURL(/\/sec-coord$/);
  });

  test('el menú de cada rol sale de la política', async ({ page }) => {
    await iniciarSesion(page, USUARIOS_POR_ROL.COORDINADOR);
    await expect(menu(page).filter({ hasText: 'Dictámenes' })).toBeVisible();
    await expect(menu(page).filter({ hasText: 'Bandeja de pases' })).toHaveCount(0);
  });

  test('el estudiante ve su file y el egresado solo Inicio y Mi perfil (D-08)', async ({ page }) => {
    await iniciarSesion(page, USUARIOS_POR_ROL.ESTUDIANTE);
    await expect(menu(page).filter({ hasText: 'Mi file académico' })).toBeVisible();

    await page.context().clearCookies();
    await page.evaluate(() => sessionStorage.clear());
    await iniciarSesion(page, USUARIOS_POR_ROL.EGRESADO);
    await expect(menu(page)).toHaveText(['Inicio', 'Mi perfil']);
  });
});
