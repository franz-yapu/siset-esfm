import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/mocks/db';
import { CLAVE_DEMO } from '@/mocks/usuarios';
import { aIso } from '@/lib/formato';
import { authMock } from './auth.mock';

const kardex = () => {
  const u = db.usuarios.find((x) => x.usuario === 'kardex');
  if (!u) throw new Error('falta el usuario kardex de la demo');
  return u;
};

describe('authMock alineado con la API (SDD S1.9)', () => {
  it('login: contraseña mala, CI inexistente y cuenta bloqueada dan el mismo 401 CREDENCIALES_INVALIDAS', async () => {
    const esperado = { codigo: 'CREDENCIALES_INVALIDAS', estado: 401, message: 'CI o contraseña incorrectos.' };
    await expect(authMock.login('kardex', 'mala')).rejects.toMatchObject(esperado);
    await expect(authMock.login('no-existe', CLAVE_DEMO)).rejects.toMatchObject(esperado);
    const u = kardex();
    u.bloqueadoHasta = aIso(new Date(Date.now() + 60_000));
    await expect(authMock.login('kardex', CLAVE_DEMO)).rejects.toMatchObject(esperado);
    u.bloqueadoHasta = undefined;
  });

  it('cambiarPassword: política, actual incorrecta y nueva igual a la actual, en el orden de la API', async () => {
    const u = kardex();
    await expect(authMock.cambiarPassword(u, 'mala', 'corta')).rejects.toMatchObject({
      codigo: 'VALIDACION',
      detalles: [{ ruta: 'body.passwordNueva', mensaje: 'Debe tener al menos 8 caracteres' }],
    });
    await expect(authMock.cambiarPassword(u, 'mala', 'nueva.clave-2')).rejects.toMatchObject({
      codigo: 'PASSWORD_ACTUAL_INCORRECTA',
      estado: 422,
    });
    // La clave de la demo no cumple la política: primero se pone una que sí la cumple.
    await authMock.cambiarPassword(u, CLAVE_DEMO, 'otra.clave-9');
    await expect(authMock.cambiarPassword(u, 'otra.clave-9', 'otra.clave-9')).rejects.toMatchObject({
      codigo: 'VALIDACION',
      detalles: [{ ruta: 'body.passwordNueva', mensaje: 'La nueva contraseña debe ser distinta de la actual' }],
    });
  });

  it('cambiarPassword correcto: quita la obligación, devuelve el usuario y la nueva entra al login', async () => {
    const u = kardex();
    u.debeCambiarClave = true;
    const devuelto = await authMock.cambiarPassword(u, 'otra.clave-9', 'tercera.clave-3');
    expect(devuelto).toMatchObject({ id: u.id, debeCambiarClave: false });
    expect(kardex().debeCambiarClave).toBe(false);
    await expect(authMock.login('kardex', 'tercera.clave-3')).resolves.toMatchObject({ id: u.id });
    await expect(authMock.login('kardex', 'otra.clave-9')).rejects.toMatchObject({ codigo: 'CREDENCIALES_INVALIDAS' });
  });
});

describe('authMock: sesión simulada de la demo (SDD S1.10 §2.2)', () => {
  const memoria = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => void memoria.set(k, v),
    removeItem: (k: string) => void memoria.delete(k),
  });
  beforeEach(() => memoria.clear());

  it('sin sesión, restaurar devuelve null', async () => {
    expect(await authMock.restaurar()).toBeNull();
  });

  it('login deja la sesión, restaurar la recupera y logout la borra', async () => {
    const u = await authMock.login('secdir', CLAVE_DEMO);
    expect(await authMock.restaurar()).toMatchObject({ id: u.id });
    await authMock.logout(null);
    expect(await authMock.restaurar()).toBeNull();
  });

  it('verComo pasa la sesión a otro usuario; un id inexistente no la cambia', async () => {
    const u = await authMock.login('secdir', CLAVE_DEMO);
    const otro = kardex();
    expect(await authMock.verComo(otro.id)).toMatchObject({ id: otro.id });
    expect(await authMock.restaurar()).toMatchObject({ id: otro.id });
    expect(await authMock.verComo(999_999)).toBeNull();
    expect(await authMock.restaurar()).toMatchObject({ id: otro.id });
    expect(u.id).not.toBe(otro.id);
  });
});
