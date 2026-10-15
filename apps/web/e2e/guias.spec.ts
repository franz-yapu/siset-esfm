import { expect, test } from '@playwright/test';
import { vigilarConsola } from './utilidades';

/** Guías públicas (DEC-048): se abren sin sesión desde el login. */
test('desde el login se abren el manual, la guía de estudio y las preguntas de defensa', async ({ page }) => {
  const problemas = vigilarConsola(page);
  await page.goto('/login');
  await page.getByRole('link', { name: /Guías: manual del personal/ }).click();
  await expect(page.getByRole('heading', { name: 'Guías de SISET' })).toBeVisible();

  await page.getByRole('link', { name: /Manual del personal y capacitación/ }).click();
  await expect(page.getByRole('heading', { name: '10. Plan de capacitación' })).toBeVisible();

  await page.goto('/guia/estudio');
  await expect(page.getByRole('heading', { name: '3. Contraseñas: dónde está el hash' })).toBeVisible();
  await expect(page.getByText('apps/api/src/modulos/seguridad/password.ts').first()).toBeVisible();

  await page.goto('/guia/defensa');
  await page.getByText('¿Cómo guarda las contraseñas?').click();
  await expect(page.getByText(/bcrypt con costo 12/)).toBeVisible();
  expect(problemas).toEqual([]);
});
