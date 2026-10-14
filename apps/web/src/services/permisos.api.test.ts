import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import type { Usuario } from '@/types';
import { permisosApi } from './permisos.api';

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

const kardex: Usuario = { id: 1, usuario: 'kardex', nombre: 'K', rol: 'KARDEX', sedeId: 2, activo: true };

describe('permisosApi (SDD S1.11 §2.3)', () => {
  it('hace GET /auth/mis-permisos y devuelve los pares conocidos', async () => {
    const peticiones = capturar(200, {
      rol: 'KARDEX',
      permisos: [
        { recurso: 'usuarios', accion: 'leer' },
        { recurso: 'auditoria', accion: 'leer' },
        { recurso: 'algo-nuevo', accion: 'leer' },
        { recurso: 'files', accion: 'borrar' },
      ],
    });
    expect(await permisosApi.misPermisos(kardex)).toEqual({
      rol: 'KARDEX',
      permisos: [
        { recurso: 'usuarios', accion: 'leer' },
        { recurso: 'auditoria', accion: 'leer' },
      ],
    });
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0]?.method).toBe('get');
    expect(peticiones[0]?.url).toBe('/auth/mis-permisos');
  });

  it('sin lista de permisos devuelve una lista vacía', async () => {
    capturar(200, { rol: 'EGRESADO' });
    expect(await permisosApi.misPermisos({ ...kardex, rol: 'EGRESADO' })).toEqual({ rol: 'EGRESADO', permisos: [] });
  });

  it.each([401, 500])('un %i se propaga como ErrorApi', async (status) => {
    capturar(status, { error: { code: 'X', message: 'fallo' } });
    await expect(permisosApi.misPermisos(kardex)).rejects.toBeInstanceOf(ErrorApi);
  });
});
