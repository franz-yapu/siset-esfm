import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api';
import type { Usuario } from '@/types';
import { guardarAccessToken, obtenerAccessToken } from '@/lib/sesion';
import { authApi, type RespuestaLogin } from './auth.api';

const adapterOriginal = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = adapterOriginal;
});

const capturar = (status: number, data: unknown) => {
  const peticiones: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (c) => {
    peticiones.push(c);
    const r = { status, data, statusText: '', headers: {}, config: c };
    if (status >= 400) throw new AxiosError('fallo', 'ERR_BAD_REQUEST', c, {}, r);
    return r;
  };
  api.defaults.adapter = adapter;
  return peticiones;
};

describe('authApi (SDD S0.8 §2.4)', () => {
  it('login hace POST /auth/login con { usuario, password }, guarda el token y traduce el usuario (SDD S1.3)', async () => {
    const respuesta: RespuestaLogin = {
      accessToken: 'jwt-de-prueba',
      expiraEn: '2026-10-14T12:15:00.000Z',
      usuario: {
        id: 1,
        usuario: '1234567',
        nombre: 'Ana',
        rol: 'KARDEX',
        sedeId: 2,
        activo: true,
        debeCambiarPassword: true,
        ultimoAcceso: null,
      },
    };
    const peticiones = capturar(200, respuesta);
    expect(await authApi.login('1234567', 'clave-1234')).toEqual({
      id: 1,
      usuario: '1234567',
      nombre: 'Ana',
      rol: 'KARDEX',
      sedeId: 2,
      activo: true,
      debeCambiarClave: true,
    } satisfies Usuario);
    expect(peticiones[0]).toMatchObject({ method: 'post', url: '/auth/login' });
    expect(JSON.parse(peticiones[0].data as string)).toEqual({ usuario: '1234567', password: 'clave-1234' });
    expect(obtenerAccessToken()).toBe('jwt-de-prueba');
  });

  it('logout borra el access token', async () => {
    guardarAccessToken('jwt-de-prueba');
    capturar(204, null);
    await authApi.logout({} as Usuario);
    expect(obtenerAccessToken()).toBeNull();
  });

  it('un 404 de la API (todavía sin endpoint) llega como ErrorApi NO_ENCONTRADO', async () => {
    capturar(404, { error: { code: 'NO_ENCONTRADO', message: 'La ruta solicitada no existe.' } });
    await expect(authApi.login('x', 'y')).rejects.toMatchObject({
      codigo: 'NO_ENCONTRADO',
      message: 'La ruta solicitada no existe.',
    });
  });

  it('cambiarPassword hace POST /auth/cambiar-password, guarda el token nuevo y devuelve el usuario sin cpw (SDD S1.9 §2.3)', async () => {
    guardarAccessToken('jwt-viejo');
    const peticiones = capturar(200, {
      accessToken: 'jwt-nuevo',
      expiraEn: '2026-10-14T12:15:00.000Z',
      usuario: {
        id: 1,
        usuario: '1234567',
        nombre: 'Ana',
        rol: 'KARDEX',
        sedeId: 2,
        activo: true,
        debeCambiarPassword: false,
        ultimoAcceso: '2026-10-14T12:00:00.000Z',
      },
    } satisfies RespuestaLogin);
    const u = await authApi.cambiarPassword({} as Usuario, 'temporal-1.', 'nueva.clave-2');
    expect(u).toMatchObject({ id: 1, debeCambiarClave: false, ultimoAcceso: '2026-10-14T12:00:00.000Z' });
    expect(peticiones[0]).toMatchObject({ method: 'post', url: '/auth/cambiar-password' });
    expect(peticiones[0].headers.get('Authorization')).toBe('Bearer jwt-viejo');
    expect(JSON.parse(peticiones[0].data as string)).toEqual({
      passwordActual: 'temporal-1.',
      passwordNueva: 'nueva.clave-2',
    });
    expect(obtenerAccessToken()).toBe('jwt-nuevo');
  });

  it('cambiarPassword con 422 rechaza con PASSWORD_ACTUAL_INCORRECTA y deja el token como estaba', async () => {
    guardarAccessToken('jwt-viejo');
    capturar(422, { error: { code: 'PASSWORD_ACTUAL_INCORRECTA', message: 'La contraseña actual no es correcta.' } });
    await expect(authApi.cambiarPassword({} as Usuario, 'mala', 'nueva.clave-2')).rejects.toMatchObject({
      codigo: 'PASSWORD_ACTUAL_INCORRECTA',
      estado: 422,
    });
    expect(obtenerAccessToken()).toBe('jwt-viejo');
  });

  it('obtener queda pendiente de S1.10; sin usuarios demo', async () => {
    await expect(authApi.obtener(1)).rejects.toMatchObject({ codigo: 'NO_IMPLEMENTADO' });
    expect(authApi.usuariosDemo()).toEqual([]);
  });
});
