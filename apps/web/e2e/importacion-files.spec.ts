import { expect, test } from '@playwright/test';
import escribir from 'write-excel-file/node';
import { iniciarSesion, USUARIOS_POR_ROL, vigilarConsola } from './utilidades';

// DEC-064 #3: Kardex importa files desde un Excel con las columnas de "Nuevo file". Primero revisa; con errores no
// importa nada; sin errores, importa y el file aparece en la lista.

const ENCABEZADO = [
  'CI',
  'Código de estudiante',
  'Nombres',
  'Apellido paterno',
  'Fecha de nacimiento',
  'Especialidad',
  'Año de ingreso',
  'Condición',
  'Modalidad de ingreso',
];
const BUENA = ['8800101', 'IMP-0001', 'Ana', 'Choque', '15/03/2004', 'Matemática', 2024, 'Estudiante', 'A'];
const MALA = ['8800102', 'IMP-0002', 'Luis', 'Mamani', '', 'Historia', 2024, 'Estudiante', 'A'];

test('Kardex revisa el Excel, ve los errores por fila e importa cuando no hay errores', async ({ page }, info) => {
  const problemas = vigilarConsola(page);
  const conError = info.outputPath('con-error.xlsx');
  const correcto = info.outputPath('correcto.xlsx');
  await escribir([ENCABEZADO, BUENA, MALA]).toFile(conError);
  await escribir([ENCABEZADO, BUENA]).toFile(correcto);

  await iniciarSesion(page, USUARIOS_POR_ROL.KARDEX);
  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await page.getByRole('button', { name: 'Importar desde Excel' }).click();

  await page.getByLabel('Archivo Excel').setInputFiles(conError);
  await expect(page.getByText('1 nuevos')).toBeVisible();
  await expect(page.getByText('1 con errores')).toBeVisible();
  await expect(
    page.getByText('Especialidad: «Historia» no está en el catálogo de especialidades').first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Importar \d+ files$/ })).toHaveCount(0);

  await page.getByLabel('Archivo Excel').setInputFiles(correcto);
  await page.getByRole('button', { name: 'Importar 1 files' }).click();
  await expect(page.getByText('Importación terminada', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await page.getByLabel('Buscar').fill('8800101');
  await expect(page.getByText('Ana Choque').first()).toBeVisible();
  expect(problemas).toEqual([]);
});
