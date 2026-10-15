import { expect, test } from '@playwright/test';
import { entrarComo, INICIO, irA, recargar, ROLES_PERSONAL, vistaDenegada, type RolPersonal } from './utilidades';

/**
 * URL directa contra la API real (SDD S1.14 §2.5, R6): sesión real de S1.10 (se restaura con el refresh)
 * y rutas por rol de S1.11 (/auth/mis-permisos).
 */

/**
 * Ruta → roles que la ven, escrita a mano desde DEC-015 (PRD §2) y DEC-022 (una bandeja exige la acción que se
 * hace en ella: firmas pide `dictamenes/crear`, solo del COORDINADOR, DEC-040). El resto ve la vista 403.
 */
const RUTAS: { ruta: string; titulo: RegExp; pasan: readonly RolPersonal[] }[] = [
  { ruta: '/usuarios', titulo: /usuarios/i, pasan: ['KARDEX'] },
  { ruta: '/bitacora', titulo: /bitácora/i, pasan: ['KARDEX'] },
  { ruta: '/files', titulo: /files/i, pasan: ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'] },
  { ruta: '/reportes', titulo: /reportes/i, pasan: ['SEC_DIR', 'COORDINADOR', 'KARDEX'] },
  { ruta: '/firmas', titulo: /firmas/i, pasan: ['COORDINADOR'] },
];

/** Etiquetas del menú que solo ve KARDEX. */
const MENU_SOLO_KARDEX = ['Usuarios', 'Bitácora'];

test.describe('E1 · sin sesión', () => {
  for (const ruta of ['/usuarios', '/bitacora', '/files', '/kardex']) {
    test(`URL directa a ${ruta} → /login`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByLabel('CI o usuario')).toBeVisible();
      await expect(vistaDenegada(page)).toHaveCount(0);
    });
  }
});

for (const rol of ROLES_PERSONAL) {
  test.describe(`E2–E4 · ${rol}`, () => {
    test.beforeEach(async ({ page }) => {
      await entrarComo(page, rol);
      await expect(page).toHaveURL(new RegExp(`${INICIO[rol]}$`));
    });

    test('E2 · cada ruta: la pantalla o la vista 403 en la misma URL', async ({ page }) => {
      for (const { ruta, titulo, pasan } of RUTAS) {
        await irA(page, ruta);
        await expect(page, ruta).toHaveURL(new RegExp(`${ruta}$`));
        if (pasan.includes(rol)) {
          await expect(vistaDenegada(page), ruta).toHaveCount(0);
          await expect(page.getByRole('heading', { level: 1, name: titulo }), ruta).toBeVisible();
        } else {
          await expect(vistaDenegada(page), ruta).toBeVisible();
        }
      }
      // El inicio de otro rol lleva al propio.
      const ajeno = rol === 'KARDEX' ? '/sec-dir' : '/kardex';
      await irA(page, ajeno);
      await expect(page).toHaveURL(new RegExp(`${INICIO[rol]}$`));
    });

    test('E3 · el menú no muestra lo que daría 403', async ({ page }) => {
      const menu = page.getByRole('navigation');
      for (const etiqueta of MENU_SOLO_KARDEX) {
        const enlace = menu.getByRole('link', { name: etiqueta, exact: true });
        if (rol === 'KARDEX') await expect(enlace).toBeVisible();
        else await expect(enlace).toHaveCount(0);
      }
    });

    test('E4 · al recargar sigue la sesión y sigue la vista 403', async ({ page }) => {
      await irA(page, '/files');
      await recargar(page);
      await expect(page).toHaveURL(/\/files$/);
      await expect(vistaDenegada(page)).toHaveCount(0);

      const prohibida = rol === 'KARDEX' ? null : '/usuarios';
      if (prohibida) {
        await irA(page, prohibida);
        await recargar(page);
        await expect(page).toHaveURL(new RegExp(`${prohibida}$`));
        await expect(vistaDenegada(page)).toBeVisible();
      }
    });
  });
}

test.describe('E6 · contraseña por cambiar', () => {
  test('con la temporal, toda URL protegida lleva a /cambiar-clave', async ({ page }) => {
    await entrarComo(page, 'TEMPORAL');
    await expect(page).toHaveURL(/\/cambiar-clave$/);
    for (const ruta of ['/usuarios', '/files', '/sec-dir']) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/cambiar-clave$/);
    }
  });
});
