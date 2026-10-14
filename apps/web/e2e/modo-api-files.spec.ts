import { expect, test, type Page, type Route } from '@playwright/test';

// Proyecto `api` (VITE_USAR_API incluye files): la API se simula con page.route (SDD S2.9-S2.10 §4).

const KARDEX = {
  accessToken: 'jwt-de-prueba',
  expiraEn: '2099-01-01T00:00:00.000Z',
  usuario: {
    id: 1,
    usuario: '1234567',
    nombre: 'María Quispe',
    rol: 'KARDEX',
    sedeId: 2,
    activo: true,
    debeCambiarPassword: false,
    ultimoAcceso: null,
  },
};
const PERMISOS = {
  rol: 'KARDEX',
  permisos: [
    { recurso: 'files', accion: 'leer' },
    { recurso: 'files', accion: 'crear' },
    { recurso: 'files', accion: 'editar' },
  ],
};
const ESPECIALIDADES = [
  { id: 1, nombre: 'Educación Primaria Comunitaria Vocacional' },
  { id: 2, nombre: 'Matemática' },
];
const file = (id: number, nombre: string) => ({
  id,
  codigo: `EST-${id}`,
  ci: `70000${id}`,
  complemento: '',
  nombres: nombre,
  apellidoPaterno: 'Mamani',
  apellidoMaterno: null,
  nombre: `${nombre} Mamani`,
  fechaNacimiento: null,
  celular: null,
  email: null,
  especialidadId: 2,
  especialidad: 'Matemática',
  anioIngreso: 2024,
  condicion: 'ESTUDIANTE',
  bloqueado: false,
  motivoBloqueo: null,
  semaforo: 'AMARILLO',
});

const responder = (r: Route, status: number, cuerpo: unknown) =>
  r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

async function entrar(page: Page) {
  await page.route('**/api/v1/auth/login', (r) => responder(r, 200, KARDEX));
  await page.route('**/api/v1/auth/mis-permisos', (r) => responder(r, 200, PERMISOS));
  await page.route('**/api/v1/catalogos/especialidades', (r) => responder(r, 200, ESPECIALIDADES));
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill('1234567');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-1234');
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test('P-40 en modo API: filtros y página van a GET /files', async ({ page }) => {
  const pedidos: URLSearchParams[] = [];
  await page.route('**/api/v1/files?*', (r) => {
    const q = new URL(r.request().url()).searchParams;
    pedidos.push(q);
    const pagina = Number(q.get('pagina'));
    return responder(r, 200, {
      datos: pagina === 2 ? [file(21, 'Zoe')] : [file(1, 'Ana')],
      pagina,
      porPagina: 20,
      total: 21,
    });
  });
  await entrar(page);
  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await expect(page.getByRole('row', { name: /Ana Mamani/ })).toBeVisible();
  // Desde S2.5 el semáforo viene de la API y también se muestra en modo API.
  await expect(page.getByRole('columnheader', { name: 'Semáforo' })).toBeVisible();

  await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
  await page.getByLabel('Buscar').fill('mamani');
  await expect.poll(() => pedidos.at(-1)?.get('texto')).toBe('mamani');
  expect(pedidos.at(-1)?.get('especialidadId')).toBe('2');

  await page.getByLabel('Semáforo').selectOption('ROJO');
  await expect.poll(() => pedidos.at(-1)?.get('semaforo')).toBe('ROJO');

  await page.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(page.getByRole('row', { name: /Zoe Mamani/ })).toBeVisible();
  expect(pedidos.at(-1)?.get('pagina')).toBe('2');
});

test('P-42 en modo API: CODIGO_EXISTENTE va debajo del código; P-41 oculta lo que no está conectado', async ({
  page,
}) => {
  await page.route('**/api/v1/files', (r) =>
    r.request().method() === 'POST'
      ? responder(r, 409, {
          error: { code: 'CODIGO_EXISTENTE', message: 'Ya existe un file con ese código de estudiante.' },
        })
      : r.fallback(),
  );
  await page.route('**/api/v1/files/7', (r) => responder(r, 200, file(7, 'Rosa')));
  await entrar(page);
  await page.getByRole('link', { name: 'Files académicos' }).first().click();
  await page.getByRole('button', { name: 'Nuevo file' }).click();
  await page.getByLabel('CI', { exact: true }).fill('7654321');
  await page.getByLabel('Código de estudiante').fill('EST-1');
  await page.getByLabel('Nombres').fill('Juana');
  await page.getByLabel('Apellido paterno').fill('Mamani');
  await page.getByLabel('Especialidad').selectOption({ label: 'Matemática' });
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Ya existe un file con ese código de estudiante.')).toBeVisible();

  await page.evaluate(() => {
    history.pushState({}, '', '/files/7');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { name: 'Rosa Mamani' })).toBeVisible();
  await expect(page.getByText(/se habilitan en una próxima versión/)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Requisitos' })).toHaveCount(0);
});
