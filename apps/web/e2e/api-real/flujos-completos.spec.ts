import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { llenarBloqueo } from '../utilidades';
import { API_E2E, credenciales, entrarComo, irA, tokenDe } from './utilidades';

/**
 * Los dos flujos del trámite de punta a punta contra la API real (DEC-033, DEC-040 a DEC-046), cada paso con el rol
 * y la pantalla que le tocan, y el bloqueo del file. Los files de los egresados se crean por la API (el alta por
 * pantalla ya la prueba `hojas-ruta.spec.ts`); datos únicos por corrida.
 */
const sufijo = Date.now().toString().slice(-6);
const EGRESADOS = {
  certificado: { ci: `61${sufijo}`, nombres: 'Certificada', paterno: 'Flujo' },
  historial: { ci: `62${sufijo}`, nombres: 'Historiada', paterno: 'Flujo' },
  bloqueo: { ci: `63${sufijo}`, nombres: 'Bloqueada', paterno: 'Flujo' },
} as const;
type Egresado = keyof typeof EGRESADOS;
const fileId: Partial<Record<Egresado, number>> = {};

async function crearEgresados(request: APIRequestContext) {
  const { usuario, password } = credenciales().KARDEX;
  const headers = { Authorization: `Bearer ${await tokenDe(request, usuario, password)}` };
  const especialidades = (await (await request.get(`${API_E2E}/catalogos/especialidades`, { headers })).json()) as {
    id: number;
  }[];
  for (const [clave, e] of Object.entries(EGRESADOS) as [Egresado, (typeof EGRESADOS)[Egresado]][]) {
    const r = await request.post(`${API_E2E}/files`, {
      headers,
      data: {
        ci: e.ci,
        complemento: '',
        nombres: e.nombres,
        apellidoPaterno: e.paterno,
        apellidoMaterno: null,
        fechaNacimiento: null,
        celular: null,
        email: null,
        codigo: `FL-${clave.slice(0, 3).toUpperCase()}-${sufijo}`,
        especialidadId: especialidades[0].id,
        anioIngreso: 2019,
        condicion: 'EGRESADO',
      },
    });
    if (r.status() === 201) {
      fileId[clave] = ((await r.json()) as { id: number }).id;
      continue;
    }
    // Repetida en el mismo proceso (--repeat-each): el file ya existe.
    expect(r.status(), `crear el file de ${e.ci}`).toBe(409);
    const lista = await request.get(`${API_E2E}/files`, { headers, params: { texto: e.ci } });
    fileId[clave] = ((await lista.json()) as { datos: { id: number; ci: string }[] }).datos.find(
      (f) => f.ci === e.ci,
    )!.id;
  }
}

/**
 * Busca y elige al egresado por su CI. La lista de sugerencias se actualiza después de escribir: hay que elegir la
 * fila con ese CI, no la primera (puede ser de la búsqueda anterior).
 */
async function elegirEgresado(page: Page, ci: string) {
  await page.getByLabel('CI o nombre del egresado').fill(ci);
  await page.getByRole('listbox').getByRole('button').filter({ hasText: ci }).click();
  await expect(page.getByText(`CI ${ci}`)).toBeVisible();
}

/** SEC_DIR registra el trámite del egresado, avisa a Kardex y devuelve el N.º. */
async function registrarTramite(page: Page, ci: string, tipo: string, valorado?: string): Promise<string> {
  await entrarComo(page, 'SEC_DIR');
  await irA(page, '/hojas-ruta/nueva');
  await elegirEgresado(page, ci);
  await page.getByLabel('Tipo de trámite').selectOption({ label: tipo });
  if (valorado) await page.getByLabel('N.º de valorado').fill(valorado);
  await page.getByRole('button', { name: 'Registrar y avisar a Kardex' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Trámite registrado' });
  const nro = (await dialogo.getByText(/^HR-\d{4}-\d{6}$/).textContent())!;
  await expect(page.getByText(`Trámite ${nro} registrado y avisado a Kardex`)).toBeVisible();
  return nro;
}

/** Un paso de Kardex desde su bandeja (DEC-041): pestaña, fila del trámite, botón del panel y confirmación. */
async function pasoEnBandeja(page: Page, ruta: string, pestana: RegExp, nro: string, boton: string, estado: string) {
  await irA(page, ruta);
  await page.getByRole('tab', { name: pestana }).click();
  // La bandeja pagina de a 10: se busca el trámite por su N.º.
  await page.getByPlaceholder('Buscar…').fill(nro);
  await page.getByRole('row').filter({ hasText: nro }).click();
  await page.getByRole('button', { name: boton }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText(`${nro}: ${estado}`)).toBeVisible();
}

/** Un paso desde el detalle del trámite, con confirmación. */
async function pasoEnDetalle(page: Page, nro: string, boton: string, estado: string) {
  await irA(page, `/hojas-ruta/${nro}`);
  await page.getByRole('button', { name: boton }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText(`${nro}: ${estado}`)).toBeVisible();
}

// Un solo worker para todo el archivo: los files se crean una vez y los flujos van en orden.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await crearEgresados(request);
});

test.describe.serial('certificado sin valorado: Calahumana → Ancocagua → Coordinador → Calahumana', () => {
  let nro = '';
  const { ci, nombres, paterno } = EGRESADOS.certificado;

  test('SEC_DIR registra el certificado y avisa a Kardex', async ({ page }) => {
    nro = await registrarTramite(page, ci, 'Certificado de notas de años pasados');
  });

  test('Kardex lo recoge y lo imprime desde sus bandejas', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await pasoEnBandeja(page, '/revision', /Por recoger/, nro, 'Registrar que Kardex lo recogió', 'En impresión');
    await pasoEnBandeja(page, '/emision', /Por imprimir/, nro, 'Marcar como impreso', 'Impreso');
  });

  test('el Coordinador lo ve en Firmas y lo firma', async ({ page }) => {
    await entrarComo(page, 'COORDINADOR');
    await irA(page, '/firmas');
    await page.getByPlaceholder('Buscar…').fill(nro);
    await page.getByRole('row').filter({ hasText: nro }).getByRole('button', { name: 'Firmar' }).click();
    await page.getByLabel('Observación (opcional)').fill('Firmado en la prueba E2E');
    await page.getByRole('dialog').getByRole('button', { name: 'Firmar' }).click();
    await expect(page.getByText(`Firmaste el trámite ${nro}`)).toBeVisible();
    await page.getByRole('tab', { name: /Firmados/ }).click();
    await page.getByPlaceholder('Buscar…').fill(nro);
    await expect(page.getByRole('row').filter({ hasText: nro })).toContainText('Firmado por el Coordinador');
  });

  test('Kardex lo remite a Calahumana', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await pasoEnBandeja(page, '/revision', /Por remitir/, nro, 'Remitir a Calahumana', 'Remitido a Calahumana');
  });

  test('SEC_DIR confirma la llegada y lo entrega al titular', async ({ page }) => {
    await entrarComo(page, 'SEC_DIR');
    await pasoEnDetalle(page, nro, 'Confirmar que llegó a Calahumana', 'Listo para entregar');
    await page.getByRole('button', { name: 'Registrar entrega' }).click();
    await expect(page.getByLabel('CI de quien recibe')).toHaveValue(ci);
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar entrega' }).click();
    await expect(page.getByText(`${nro}: Entregado`)).toBeVisible();
    await expect(page.getByText(`Entregado a titular (CI ${ci})`)).toBeVisible();
  });

  test('el egresado sigue el trámite sin cuenta, con el N.º del QR y su CI', async ({ page }) => {
    await page.goto(`/seguimiento?hr=${nro}`);
    await page.getByLabel('CI del titular').fill(ci);
    await page.getByRole('button', { name: 'Consultar' }).click();
    await expect(page.getByText(`${nombres} ${paterno}`)).toBeVisible();
    for (const paso of [
      'Recibido',
      'Avisado a Kardex',
      'En impresión',
      'Impreso',
      'Firmado por el Coordinador',
      'Remitido a Calahumana',
      'Listo para entregar',
      'Entregado',
    ])
      await expect(page.getByText(paso, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Secretaría')).toHaveCount(0); // sin quién hizo cada paso (RF-09 CA3)
  });

  test('la bitácora tiene la ingesta y los 7 cambios de estado', async ({ page }) => {
    await entrarComo(page, 'ADMIN');
    await irA(page, `/bitacora?entidad=hoja_ruta&entidadId=${nro}`);
    const filas = page.locator('table tbody tr');
    await expect(filas.filter({ hasText: 'Cambio de estado' })).toHaveCount(7);
  });
});

test.describe.serial('historial con valorado: las firmas de las direcciones las anota SEC_DIR', () => {
  let nro = '';
  const { ci } = EGRESADOS.historial;

  test('SEC_DIR lo registra con valorado', async ({ page }) => {
    nro = await registrarTramite(page, ci, 'Historial académico', `7${sufijo}`);
  });

  test('Kardex lo recoge y lo imprime', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await pasoEnBandeja(page, '/revision', /Por recoger/, nro, 'Registrar que Kardex lo recogió', 'En impresión');
    await pasoEnBandeja(page, '/emision', /Por imprimir/, nro, 'Marcar como impreso', 'Impreso');
  });

  test('el Coordinador no lo firma: no está en Firmas ni tiene botón en el detalle', async ({ page }) => {
    await entrarComo(page, 'COORDINADOR');
    await irA(page, '/firmas');
    await expect(page.getByRole('heading', { name: 'Firmas' })).toBeVisible();
    await page.getByPlaceholder('Buscar…').fill(nro);
    await expect(page.getByText('No hay certificados esperando tu firma')).toBeVisible();
    await irA(page, `/hojas-ruta/${nro}`);
    await expect(page.getByText('Impreso').first()).toBeVisible();
    await expect(page.getByText('Acción disponible:')).toHaveCount(0);
  });

  test('SEC_DIR registra las dos firmas y la entrega a un familiar de otro día (D-42)', async ({ page }) => {
    await entrarComo(page, 'SEC_DIR');
    await pasoEnDetalle(page, nro, 'Registrar firma de Dirección Académica', 'Firmado por Dir. Académica');
    await pasoEnDetalle(page, nro, 'Registrar firma de Dirección General', 'Listo para entregar');
    await page.getByRole('button', { name: 'Registrar entrega' }).click();
    await page.getByLabel('Entregado a').selectOption('Familiar');
    await page.getByLabel('Parentesco', { exact: true }).selectOption('Madre');
    await page.getByLabel('Nombre de quien recibe').fill('Rosa Flujo');
    await page.getByLabel('CI de quien recibe').fill('5566778');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Registrar entrega' })).toBeDisabled();
    await page.getByLabel('Verifiqué el parentesco y firmó el recojo.').check();
    const ayer = new Date(Date.now() - 28 * 3600_000).toISOString().slice(0, 10);
    await page.getByLabel('Fecha').fill(ayer);
    await page.getByRole('dialog').getByRole('button', { name: 'Registrar entrega' }).click();
    await expect(page.getByText(`${nro}: Entregado`)).toBeVisible();
    const [a, m, d] = ayer.split('-');
    await expect(
      page.getByText(
        `Entregado a familiar: madre, Rosa Flujo (CI 5566778); parentesco verificado y firma de recojo el ${d}/${m}/${a}`,
      ),
    ).toBeVisible();
  });
});

test.describe.serial('file bloqueado: no se registra el trámite hasta el desbloqueo', () => {
  const { ci } = EGRESADOS.bloqueo;

  const elegirTitular = async (page: Page) => {
    await entrarComo(page, 'SEC_DIR');
    await irA(page, '/hojas-ruta/nueva');
    await elegirEgresado(page, ci);
  };

  test('Kardex bloquea el file con la resolución', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, `/files/${fileId.bloqueo}`);
    await page.getByRole('button', { name: 'Bloquear' }).click();
    await llenarBloqueo(page.getByRole('dialog'), {
      glosa: 'Permiso obligatorio por una gestión (E2E)',
      nroResolucion: `RES-E2E-${sufijo}`,
    });
    await page.getByRole('dialog').getByRole('button', { name: 'Bloquear' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Desbloquear' })).toBeVisible();
  });

  test('SEC_DIR ve el bloqueo y no puede registrar', async ({ page }) => {
    await elegirTitular(page);
    await expect(page.getByText('Permiso obligatorio por una gestión (E2E)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar y avisar a Kardex' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Solo registrar' })).toBeDisabled();
  });

  test('Kardex lo desbloquea (la resolución ya está registrada)', async ({ page }) => {
    await entrarComo(page, 'KARDEX');
    await irA(page, `/files/${fileId.bloqueo}`);
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByRole('dialog').getByText(`RES-E2E-${sufijo}`)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bloquear' })).toBeVisible();
  });

  test('SEC_DIR ya puede registrar el trámite', async ({ page }) => {
    await elegirTitular(page);
    await page.getByLabel('Tipo de trámite').selectOption({ label: 'Certificado de excelencia de años pasados' });
    await expect(page.getByRole('button', { name: 'Registrar y avisar a Kardex' })).toBeEnabled();
  });
});
