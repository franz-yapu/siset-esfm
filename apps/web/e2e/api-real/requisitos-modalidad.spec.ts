import { expect, test } from '@playwright/test';
import { API_E2E, credenciales, entrarComo, irA, tokenDe } from './utilidades';

/** Kardex administra los requisitos por modalidad contra la API real (DEC-055). */
const sufijo = Date.now().toString(36).slice(-5).toUpperCase();
const NOMBRE = `Requisito E2E ${sufijo}`;
/** Código de modalidad único por corrida (letras y números, hasta 10). */
const MODALIDAD = `E${sufijo}`;

test.describe.serial('requisitos por modalidad (DEC-055)', () => {
  test.afterAll(async ({ request }) => {
    // Lo deja de baja para no cambiar el semáforo de los files de las otras pruebas.
    const { usuario, password } = credenciales().KARDEX;
    const headers = { Authorization: `Bearer ${await tokenDe(request, usuario, password)}` };
    const todos = (await (await request.get(`${API_E2E}/catalogos/requisitos/todos`, { headers })).json()) as {
      id: number;
      nombre: string;
      activo: boolean;
    }[];
    for (const r of todos.filter((x) => x.nombre === NOMBRE && x.activo))
      await request.post(`${API_E2E}/catalogos/requisitos/${r.id}/baja`, { headers });
    const modalidades = (await (await request.get(`${API_E2E}/catalogos/modalidades/todas`, { headers })).json()) as {
      id: number;
      codigo: string;
      activo: boolean;
    }[];
    for (const m of modalidades.filter((x) => x.codigo === MODALIDAD && x.activo))
      await request.post(`${API_E2E}/catalogos/modalidades/${m.id}/baja`, { headers });
  });

  test('Kardex agrega un requisito solo para B2, lo amplía a B3 y lo da de baja', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await page.getByRole('navigation').getByRole('link', { name: 'Requisitos por modalidad' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Requisitos por modalidad' })).toBeVisible();

    await page.getByRole('button', { name: 'Agregar requisito' }).click();
    const modal = page.getByRole('dialog', { name: 'Agregar requisito' });
    await modal.getByLabel('Nombre', { exact: true }).fill(NOMBRE);
    for (const m of ['A', 'B1', 'B3']) await modal.getByLabel(m, { exact: true }).uncheck();
    await modal.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText(`"${NOMBRE}" agregado`)).toBeVisible();

    await page.getByRole('tab', { name: /Modalidad B2/ }).click();
    await page.getByPlaceholder('Buscar…').fill(sufijo);
    const fila = page.getByRole('row', { name: new RegExp(NOMBRE) });
    await expect(fila).toBeVisible();
    await page.getByRole('tab', { name: /Modalidad A/ }).click();
    await expect(fila).toHaveCount(0);

    // La tabla también se dibuja como tarjetas para el celular: se trabaja dentro de la fila.
    await page.getByRole('tab', { name: /^Todas/ }).click();
    await fila.getByLabel(`Pedir "${NOMBRE}" a la modalidad B3`).check();
    await expect(page.getByText(`${NOMBRE}: B2, B3`)).toBeVisible();

    await fila.getByRole('button', { name: `Dar de baja ${NOMBRE}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click();
    await expect(page.getByText(`"${NOMBRE}" dado de baja`)).toBeVisible();
    await page.getByRole('tab', { name: /Dados de baja/ }).click();
    await expect(page.getByRole('row', { name: new RegExp(NOMBRE) })).toBeVisible();
  });

  test('Kardex agrega una modalidad, aparece como columna y la da de baja (DEC-058)', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, '/requisitos');
    await page.getByRole('button', { name: 'Modalidades', exact: true }).click();
    await page.getByRole('button', { name: 'Agregar modalidad' }).click();
    const modal = page.getByRole('dialog', { name: 'Agregar modalidad' });
    await modal.getByLabel('Código').fill(MODALIDAD.toLowerCase());
    await modal.getByLabel('Nombre', { exact: true }).fill(`Modalidad de prueba ${sufijo}`);
    await modal.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByText(`Modalidad ${MODALIDAD} agregada`)).toBeVisible();

    // En la vista de requisitos ya es una columna y una pestaña.
    await page.getByRole('button', { name: 'Requisitos', exact: true }).click();
    await expect(page.getByRole('tab', { name: new RegExp(`Modalidad ${MODALIDAD}`) })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: MODALIDAD, exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Modalidades', exact: true }).click();
    const fila = page.getByRole('row').filter({ hasText: `Modalidad de prueba ${sufijo}` });
    await fila.getByRole('button', { name: `Dar de baja la modalidad ${MODALIDAD}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Dar de baja' }).click();
    await expect(page.getByText(`Modalidad ${MODALIDAD} dada de baja`)).toBeVisible();
    await page.getByRole('button', { name: 'Requisitos', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: MODALIDAD, exact: true })).toHaveCount(0);
  });

  test('SEC_COORD no la abre', async ({ page }) => {
    await entrarComo(page, 'SEC_COORD');
    await irA(page, '/requisitos');
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
  });
});
