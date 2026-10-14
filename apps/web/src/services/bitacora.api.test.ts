import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import type { Pagina } from '@/types/pagina';
import type { RegistroAuditoria } from '@/types/bitacora';
import { bitacoraApi, parametrosAuditoria } from './bitacora.api';

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

const PAGINA: Pagina<RegistroAuditoria> = {
  datos: [
    {
      id: 812,
      fecha: '2026-10-20T14:03:11.000Z',
      usuario: null,
      accion: 'LOGIN_FALLIDO',
      modulo: 'SEGURIDAD',
      entidad: 'usuario',
      entidadId: '9999999',
      antes: null,
      despues: { motivo: 'CI_INEXISTENTE' },
      ip: '198.51.100.4',
      userAgent: 'Mozilla/5.0',
    },
  ],
  pagina: 2,
  porPagina: 50,
  total: 51,
};

describe('bitacoraApi (SDD S6.5 §2.1)', () => {
  it('listar hace GET /auditoria solo con los filtros presentes y devuelve la página tal cual', async () => {
    const peticiones = capturar(200, PAGINA);
    const r = await bitacoraApi.listar({ modulo: 'SEGURIDAD', usuarioId: 3, desde: '2026-10-01' }, 2, 50);
    expect(r).toEqual(PAGINA);
    expect(peticiones).toHaveLength(1);
    expect(peticiones[0].method).toBe('get');
    expect(peticiones[0].url).toBe('/auditoria');
    expect(peticiones[0].params).toEqual({
      modulo: 'SEGURIDAD',
      usuarioId: '3',
      desde: '2026-10-01',
      pagina: '2',
      porPagina: '50',
    });
  });

  it('parametrosAuditoria omite los filtros vacíos', () => {
    expect(parametrosAuditoria({ entidad: 'usuario', entidadId: undefined, desde: '' }, 1, 50)).toEqual({
      entidad: 'usuario',
      pagina: '1',
      porPagina: '50',
    });
  });

  it('un 403 llega como ErrorApi con el código de la API', async () => {
    capturar(403, { error: { code: 'PROHIBIDO', message: 'No tiene permiso.' } });
    const e = await bitacoraApi.listar({}, 1, 50).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorApi);
    expect(e).toMatchObject({ codigo: 'PROHIBIDO', estado: 403, message: 'No tiene permiso.' });
  });

  it('buscarUsuarios hace GET /usuarios?texto=&porPagina=10 y se queda con id, usuario y nombre', async () => {
    const peticiones = capturar(200, {
      datos: [{ id: 4, usuario: '4567890', nombre: 'Rosa Quispe', rol: 'SEC_COORD', ci: '4567890', activo: true }],
      pagina: 1,
      porPagina: 10,
      total: 1,
    });
    expect(await bitacoraApi.buscarUsuarios('  rosa ')).toEqual([{ id: 4, usuario: '4567890', nombre: 'Rosa Quispe' }]);
    expect(peticiones[0].url).toBe('/usuarios');
    expect(peticiones[0].params).toEqual({ texto: 'rosa', porPagina: '10' });
  });
});
