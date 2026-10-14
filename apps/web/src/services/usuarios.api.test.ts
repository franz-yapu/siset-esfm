import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import type { Usuario } from '@/types';
import type { UsuarioDetalle } from '@/types/usuarios';
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import { usuariosApi } from './usuarios.api';

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

const actor = { id: 1, usuario: '1234567', nombre: 'Kardex', rol: 'KARDEX', sedeId: 2, activo: true } as Usuario;

const detalle: UsuarioDetalle = {
  id: 4,
  usuario: '4567890-1B',
  ci: '4567890',
  complemento: '1B',
  nombres: 'Rosa',
  apellidoPaterno: 'Quispe',
  apellidoMaterno: null,
  nombre: 'Rosa Quispe',
  email: null,
  celular: '71234567',
  rol: 'SEC_COORD',
  sedeId: 2,
  activo: true,
  estado: 'ACTIVO',
  bloqueadoHasta: null,
  debeCambiarPassword: true,
  ultimoAcceso: null,
};

describe('usuariosApi (contrato de S1.8 §2.1)', () => {
  it('listar: GET /usuarios con pagina/porPagina y sin filtros vacíos', async () => {
    const pagina = { datos: [detalle], pagina: 1, porPagina: 20, total: 1 };
    const p = capturar(200, pagina);
    expect(await usuariosApi.listar({ texto: '  ', rol: 'KARDEX', pagina: 1, porPagina: 20 })).toEqual(pagina);
    expect(p[0].method).toBe('get');
    expect(p[0].url).toBe('/usuarios');
    expect(p[0].params).toEqual({ rol: 'KARDEX', pagina: 1, porPagina: 20 });
  });

  it('obtener: GET /usuarios/:id', async () => {
    const p = capturar(200, detalle);
    expect(await usuariosApi.obtener(4)).toEqual(detalle);
    expect([p[0].method, p[0].url]).toEqual(['get', '/usuarios/4']);
  });

  it('crear: POST /usuarios con los datos y devuelve la temporal', async () => {
    const p = capturar(201, { usuario: detalle, passwordTemporal: 'k7#Qm2xP?a9R' });
    const datos = {
      ci: '4567890',
      complemento: '1B',
      nombres: 'Rosa',
      apellidoPaterno: 'Quispe',
      apellidoMaterno: null,
      email: null,
      celular: null,
      rol: 'SEC_COORD' as const,
      sedeId: 2,
    };
    const r = await usuariosApi.crear(datos, actor);
    expect(r.passwordTemporal).toBe('k7#Qm2xP?a9R');
    expect([p[0].method, p[0].url]).toEqual(['post', '/usuarios']);
    expect(JSON.parse(p[0].data as string)).toEqual(datos);
  });

  it('editar: PATCH /usuarios/:id solo con los cambios', async () => {
    const p = capturar(200, detalle);
    await usuariosApi.editar(4, { celular: '70000000' }, actor);
    expect([p[0].method, p[0].url]).toEqual(['patch', '/usuarios/4']);
    expect(JSON.parse(p[0].data as string)).toEqual({ celular: '70000000' });
  });

  it.each([
    ['darDeBaja', '/usuarios/4/baja'],
    ['reactivar', '/usuarios/4/reactivar'],
    ['desbloquear', '/usuarios/4/desbloquear'],
  ] as const)('%s: POST %s', async (metodo, url) => {
    const p = capturar(200, detalle);
    expect(await usuariosApi[metodo](4, actor)).toEqual(detalle);
    expect([p[0].method, p[0].url]).toEqual(['post', url]);
  });

  it('restablecerPassword: POST /usuarios/:id/restablecer-password y devuelve la temporal', async () => {
    const p = capturar(200, { usuario: detalle, passwordTemporal: 'n3W&tEmp0ral' });
    expect((await usuariosApi.restablecerPassword(4, actor)).passwordTemporal).toBe('n3W&tEmp0ral');
    expect([p[0].method, p[0].url]).toEqual(['post', '/usuarios/4/restablecer-password']);
  });

  it('un 409 llega como ErrorApi USUARIO_EXISTENTE con su mensaje', async () => {
    capturar(409, { error: { code: 'USUARIO_EXISTENTE', message: 'Ya existe un usuario con ese CI.' } });
    const e = await usuariosApi.obtener(4).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErrorApi);
    expect(e).toMatchObject({ codigo: 'USUARIO_EXISTENTE', estado: 409, message: 'Ya existe un usuario con ese CI.' });
  });
});
