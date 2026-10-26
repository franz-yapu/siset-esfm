import { expect, test, type Page } from '@playwright/test';
import { iniciarSesion, vigilarConsola, llenarBloqueo } from './utilidades';

// P-40, P-41 y P-42 en la demo (SDD S2.9-S2.10 §4). El mock vive en memoria: se navega con el menú y los
// enlaces, sin recargar, para no perder lo creado.

/** Escribe en el buscador y espera a que la búsqueda se aplique (va a la URL tras 300 ms). */
const buscar = async (page: Page, texto: string) => {
  await page.getByLabel('Buscar').fill(texto);
  await expect(page).toHaveURL(new RegExp(`texto=${encodeURIComponent(texto)}`));
};

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
    await page.getByLabel('Modalidad de ingreso').selectOption('A');
    await page.getByLabel('Fecha de nacimiento').fill('2004-05-10');
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
    await page.getByLabel('Modalidad de ingreso').selectOption('A');
    await page.getByLabel('Fecha de nacimiento').fill('2004-05-10');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ya existe un file con ese código de estudiante.')).toBeVisible();

    await page.getByRole('link', { name: 'Files académicos' }).first().click();
    await buscar(page, '9911223');
    await expect(page.getByRole('row', { name: /Juana Zuñiga Quispe/ })).toBeVisible();
    await buscar(page, 'zuñiga');
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

  test('Kardex bloquea con la resolución y su PDF y desbloquea (DEC-049)', async ({ page }) => {
    const problemas = vigilarConsola(page);
    await irAFiles(page);
    await buscar(page, '7012345');
    await page.getByRole('row', { name: /Juan Carlos/ }).click();

    await page.getByRole('button', { name: 'Bloquear', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Bloquear file' });
    await modal.getByRole('button', { name: 'Bloquear', exact: true }).click();
    await expect(modal.getByText('Adjunte el PDF de la resolución')).toBeVisible();
    await llenarBloqueo(modal, {
      glosa: 'Licencia temporal obligatoria por reprobación',
      nroResolucion: 'RA-045/2026',
    });
    await modal.getByRole('button', { name: 'Bloquear', exact: true }).click();
    await expect(page.getByText('File bloqueado').first()).toBeVisible();
    await expect(page.getByText(/Licencia temporal obligatoria por reprobación/).first()).toBeVisible();
    await expect(page.getByText(/RA-045\/2026/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ver PDF de la resolución' })).toBeVisible();

    await page.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    const otro = page.getByRole('dialog', { name: 'Desbloquear file' });
    await expect(otro.getByText(/RA-045\/2026/)).toBeVisible();
    await otro.getByRole('button', { name: 'Desbloquear', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bloquear', exact: true })).toBeVisible();
    expect(problemas).toEqual([]);
  });

  test('Kardex registra los requisitos del folder personal: observado, TACFI y matrícula por gestión (DEC-051)', async ({
    page,
  }) => {
    const problemas = vigilarConsola(page);
    await irAFiles(page);
    await page.getByRole('button', { name: 'Nuevo file' }).click();
    await page.getByLabel('CI', { exact: true }).fill('9911300');
    await page.getByLabel('Código de estudiante').fill('EST-2026-9300');
    await page.getByLabel('Nombres').fill('Elsa');
    await page.getByLabel('Apellido paterno').fill('Choque');
    await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
    await page.getByLabel('Modalidad de ingreso').selectOption('A');
    await page.getByLabel('Fecha de nacimiento').fill('2004-05-10');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await page.getByRole('tab', { name: 'Requisitos' }).click();
    // Sin género, la libreta militar no se le pide.
    await expect(page.getByRole('listitem', { name: 'Fotocopia simple de la libreta militar' })).toContainText(
      'Solo varones',
    );

    const tcloa = 'Certificado legalizado TCLOA';
    const fila = page.getByRole('listitem', { name: tcloa });
    await fila.getByRole('button', { name: `Registrar ${tcloa}` }).click();
    const modal = page.getByRole('dialog', { name: tcloa });
    await modal.getByLabel('Estado').selectOption('OBSERVADO');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(modal.getByText(/Escriba la observación/)).toBeVisible();
    await modal.getByLabel('Observación').fill('No se presentó; se reprograma');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(fila.getByText('No se presentó; se reprograma')).toBeVisible();
    // El semáforo de la cabecera cambia al instante (RF-06 CA2, S2.5): rojo por el requisito observado.
    await expect(page.getByText('Requisito observado o atrasado').first()).toBeVisible();
    await fila.getByRole('button', { name: `Actualizar ${tcloa}` }).click();
    await modal.getByLabel('Estado').selectOption('COMPLETO');
    await modal.getByLabel('Fecha').fill('2026-08-14');
    await modal.getByLabel('N.º de documento').fill('TCLO-0451');
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(fila.getByText('N.º: TCLO-0451')).toBeVisible();

    const tacfi = 'Certificado legalizado de TACFI – Tecnológico I';
    await page.getByRole('button', { name: `Registrar ${tacfi}`, exact: true }).click();
    const dTacfi = page.getByRole('dialog', { name: tacfi });
    await dTacfi.getByLabel('Fecha en que lo tomó').fill('2025-04-08');
    await dTacfi.getByRole('button', { name: 'Guardar' }).click();
    await expect(dTacfi.getByText('Escriba el nombre del curso')).toBeVisible();
    await dTacfi.getByLabel('Nombre del curso').fill('Inteligencia artificial aplicada al modelo educativo');
    await dTacfi.getByLabel('Entidad emisora').fill('Instituto Tecnológico Superior');
    await dTacfi.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('listitem', { name: tacfi, exact: true })).toContainText(
      'Entidad emisora: Instituto Tecnológico Superior',
    );

    await page.getByRole('button', { name: 'Agregar gestión de Matrícula' }).click();
    const dMat = page.getByRole('dialog', { name: 'Matrícula: nueva gestión' });
    await dMat.getByLabel('Gestión').fill('ii/2026');
    await dMat.getByLabel('Fecha').fill('2026-07-13');
    await dMat.getByRole('button', { name: 'Guardar' }).click();
    await expect(
      page.getByRole('listitem', { name: 'Matrícula' }).getByRole('button', { name: /II\/2026/ }),
    ).toBeVisible();
    expect(problemas).toEqual([]);
  });
});
