import { readFileSync } from 'node:fs';
import { expect, type Locator, type Page } from '@playwright/test';

/** Contraseña de prueba del prototipo, leída de los mocks (no es un secreto). */
export const CLAVE_DEMO = readFileSync(new URL('../src/mocks/usuarios.ts', import.meta.url), 'utf8').match(
  /CLAVE_DEMO\s*=\s*'([^']+)'/,
)![1];

/** Un usuario de prueba por rol (tabla de la sección 2 de la spec del prototipo). */
export const USUARIOS_POR_ROL = {
  ESTUDIANTE: '7012345',
  SEC_DIR: 'secdir',
  SEC_COORD: 'seccoord',
  COORDINADOR: 'coordinador',
  KARDEX: 'kardex',
  ADMIN: 'admin',
} as const;

/** Junta errores y advertencias de consola y de página; el test exige que queden vacíos. */
export function vigilarConsola(page: Page): string[] {
  const problemas: string[] = [];
  page.on('pageerror', (e) => problemas.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problemas.push(`${m.type()}: ${m.text()}`);
  });
  return problemas;
}

export async function iniciarSesion(page: Page, usuario: string, clave = CLAVE_DEMO): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('CI o usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Llena el formulario "Bloquear file" (DEC-049): causa, resolución, fecha, glosa y un PDF mínimo. */
export async function llenarBloqueo(
  dialogo: Locator,
  { glosa, nroResolucion = 'RA-E2E/2026' }: { glosa: string; nroResolucion?: string },
): Promise<void> {
  await dialogo.getByLabel('Causa').selectOption({ label: 'Licencia temporal obligatoria' });
  await dialogo.getByLabel('Número de resolución').fill(nroResolucion);
  await dialogo.getByLabel('Fecha de la resolución').fill('2026-10-01');
  await dialogo.getByLabel('Glosa').fill(glosa);
  await dialogo.getByLabel('PDF de la resolución').setInputFiles({
    name: 'resolucion.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n', 'latin1'),
  });
}
