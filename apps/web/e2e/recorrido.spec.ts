import { expect, test } from '@playwright/test';
import { iniciarSesion, USUARIOS_POR_ROL, vigilarConsola } from './utilidades';

const DETALLE = /\/(hojas-ruta|files|mis-tramites|dictamenes)\/[^/]+$/;

for (const [rol, usuario] of Object.entries(USUARIOS_POR_ROL)) {
  test(`recorrido de ${rol}: cada pantalla del menú y su primer detalle`, async ({ page }) => {
    const problemas = vigilarConsola(page);
    await iniciarSesion(page, usuario);

    const enlaces = await page
      .locator('nav a[href]')
      .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href') ?? ''))].filter(Boolean));
    expect(enlaces.length).toBeGreaterThan(1);

    const visitar = async (ruta: string) => {
      await page.goto(ruta);
      await expect(page.locator('h1').first(), `h1 en ${ruta}`).toBeVisible();
      await expect(page, `${ruta} no redirige a no autorizado`).not.toHaveURL(/no-autorizado/);
      await expect(page.locator('h1').first()).not.toHaveText(/no encontrad/i);
    };

    for (const ruta of enlaces) {
      await visitar(ruta);
      const detalle = await page
        .locator('main a[href^="/"]')
        .evaluateAll(
          (as, patron) =>
            as
              .map((a) => a.getAttribute('href') ?? '')
              .find((h) => new RegExp(patron).test(h) && !h.endsWith('/nueva')),
          DETALLE.source,
        );
      if (detalle) await visitar(detalle);
    }

    expect(problemas, 'sin errores ni advertencias de consola').toEqual([]);
  });
}
