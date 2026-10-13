import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api';
import type { Usuario } from '@/types';
import { authApi } from './auth.api';

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
  it('login hace POST /auth/login con { usuario, clave } y devuelve el usuario', async () => {
    const usuario = { id: 1, usuario: '1234567', nombre: 'Ana', rol: 'KARDEX', sedeId: 2, activo: true } as Usuario;
    const peticiones = capturar(200, usuario);
    expect(await authApi.login('1234567', 'clave1234')).toEqual(usuario);
    expect(peticiones[0]).toMatchObject({ method: 'post', url: '/auth/login' });
    expect(JSON.parse(peticiones[0].data as string)).toEqual({ usuario: '1234567', clave: 'clave1234' });
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
