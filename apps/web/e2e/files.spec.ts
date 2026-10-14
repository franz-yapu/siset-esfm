import { expect, test, type Page } from '@playwright/test';
import { iniciarSesion, vigilarConsola } from './utilidades';

// P-40, P-41 y P-42 en la demo (SDD S2.9-S2.10 §4). El mock vive en memoria: se navega con el menú y los
// enlaces, sin recargar, para no perder lo creado.

const irAFiles = async (page: Page) => {
  await iniciarSesion(page, 'kardex');
  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await expect(page.getByRole('heading', { name: 'Files académicos' })).toBeVisible();
};

test.describe('files conectados en la demo (S2.9, S2.10)', () => {
  test('Kardex crea un file, lo encuentra por CI y por nombre, lo edita y lo ve en otra pantalla', async ({ page }) => {
    const problemas = vigilarConsola(page);
    await irAFiles(page);

    await page.getByRole('button', { name: 'Nuevo file' }).click();
    await page.getByLabel('CI', { exact: true }).fill('9911223');
    await page.getByLabel('Código de estudiante').fill('EST-2026-9001');
    await page.getByLabel('Nombres').fill('Juana');
    await page.getByLabel('Apellido paterno').fill('Zuñiga');
    await page.getByLabel('Apellido materno').fill('Quispe');
    await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
    await page.getByLabel('Año de ingreso').fill('2026');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'Juana Zuñiga Quispe' })).toBeVisible();

    // Código repetido: el error de la API va debajo del código.
    await page.getByRole('link', { name: 'Files académicos' }).first().click();
    await page.getByRole('button', { name: 'Nuevo file' }).click();
    await page.getByLabel('CI', { exact: true }).fill('9911224');
    await page.getByLabel('Código de estudiante').fill('EST-2026-9001');
    await page.getByLabel('Nombres').fill('Otra');
    await page.getByLabel('Apellido paterno').fill('Persona');
    await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ya existe un file con ese código de estudiante.')).toBeVisible();

    await page.getByRole('link', { name: 'Files académicos' }).first().click();
    await page.getByLabel('Buscar').fill('9911223');
    await expect(page.getByRole('row', { name: /Juana Zuñiga Quispe/ })).toBeVisible();
    await page.getByLabel('Buscar').fill('zuñiga');
    await page.getByRole('row', { name: /Juana Zuñiga Quispe/ }).click();

    // Editar en la pestaña de datos: celular.
    await page.getByLabel('Celular').fill('71234567');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Datos actualizados')).toBeVisible();

    // En la demo, las secciones del prototipo siguen: el file nuevo tiene sus requisitos pendientes.
    await page.getByRole('tab', { name: 'Requisitos' }).click();
    await expect(page.getByText('Aún no registrado').first()).toBeVisible();
    expect(problemas).toEqual([]);
  });

  test('los filtros quedan en la URL y vuelven al regresar del detalle', async ({ page }) => {
    await irAFiles(page);
    await page.getByLabel('Condición').selectOption('EGRESADO');
    await expect(page).toHaveURL(/condicion=EGRESADO/);
    await page.getByRole('row').nth(1).click();
    await page.goBack();
    await expect(page.getByLabel('Condición')).toHaveValue('EGRESADO');
  });
});
