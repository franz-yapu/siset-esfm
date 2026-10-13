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

  it('obtener y cambiarClave quedan pendientes de S1.x; sin usuarios demo', async () => {
    await expect(authApi.obtener(1)).rejects.toMatchObject({ codigo: 'NO_IMPLEMENTADO' });
    await expect(authApi.cambiarClave({} as Usuario, 'x')).rejects.toMatchObject({ codigo: 'NO_IMPLEMENTADO' });
    expect(authApi.usuariosDemo()).toEqual([]);
  });
});
