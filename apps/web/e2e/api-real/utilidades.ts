import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

/** E2E contra la API real (SDD S1.14 §2.4–2.5). */
export const API_E2E = 'http://localhost:3100/api/v1';
export const ARCHIVO_USUARIOS = new URL('../.auth/usuarios.json', import.meta.url);

export type RolPersonal = 'SEC_DIR' | 'SEC_COORD' | 'COORDINADOR' | 'KARDEX';
export type CuentaE2E = RolPersonal | 'BLOQUEO' | 'TEMPORAL';
export interface Credencial {
  id: number;
  usuario: string;
  password: string;
}

/** Lo que dejó `preparar.setup.ts`. */
export const credenciales = (): Record<CuentaE2E, Credencial> =>
  JSON.parse(readFileSync(ARCHIVO_USUARIOS, 'utf8')) as Record<CuentaE2E, Credencial>;

export const ROLES_PERSONAL: readonly RolPersonal[] = ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'];

export const INICIO: Record<RolPersonal, string> = {
  SEC_DIR: '/sec-dir',
  SEC_COORD: '/sec-coord',
  COORDINADOR: '/coordinador',
  KARDEX: '/kardex',
};

/** Llena el formulario de login (nombres accesibles de hoy, SDD S1.14 §2.7 S1.10 #4). */
export async function llenarLogin(page: Page, usuario: string, password: string): Promise<void> {
  await page.getByLabel('CI o usuario').fill(usuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: /ingresar|iniciar/i }).click();
}

export async function entrarComo(page: Page, cuenta: CuentaE2E): Promise<void> {
  const { usuario, password } = credenciales()[cuenta];
  await page.goto('/login');
  await llenarLogin(page, usuario, password);
  await expect(page).not.toHaveURL(/\/login/);
}

/** Access token de una cuenta, directo contra la API (para preparar o limpiar). */
export async function tokenDe(request: APIRequestContext, usuario: string, password: string): Promise<string> {
  const r = await request.post(`${API_E2E}/auth/login`, { data: { usuario, password } });
  expect(r.status(), `login de ${usuario}`).toBe(200);
  return ((await r.json()) as { accessToken: string }).accessToken;
}

/** Vista P-04 de S1.11: "Acceso denegado" en la misma URL. */
export const vistaDenegada = (page: Page) => page.getByRole('heading', { name: 'Acceso denegado' });

/**
 * Va a una URL y espera a que la sesión termine de restaurarse (menú visible o login). Navegar con un
 * refresh en vuelo puede perder la cookie rotada y disparar REUSO_SESION (bug abierto: ticket S1.15).
 */
export async function irA(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta);
  await expect(page.getByRole('navigation').or(page.getByLabel('CI o usuario')).first()).toBeVisible();
}

/** Recarga con la misma espera que `irA`. */
export async function recargar(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByRole('navigation').or(page.getByLabel('CI o usuario')).first()).toBeVisible();
}
