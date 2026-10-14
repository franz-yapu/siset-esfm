import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import type { Usuario } from '@/types';
import type { DatosCrearFile, FileDetalle } from '@/types/files';
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import { filesApi } from './files.api';

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

const detalle: FileDetalle = {
  id: 12,
  codigo: 'EST-2024-015',
  ci: '7654321',
  complemento: '',
  nombres: 'Juana',
  apellidoPaterno: 'Mamani',
  apellidoMaterno: null,
  nombre: 'Juana Mamani',
  fechaNacimiento: null,
  celular: null,
  email: null,
  especialidadId: 2,
  especialidad: 'Matemática',
  anioIngreso: 2024,
  condicion: 'ESTUDIANTE',
  bloqueado: false,
  motivoBloqueo: null,
  semaforo: 'AMARILLO',
};

describe('filesApi (SDD S2.9-S2.10 §2.1)', () => {
  it('listar manda los filtros sin los vacíos', async () => {
    const p = capturar(200, { datos: [detalle], pagina: 2, porPagina: 20, total: 21 });
    const r = await filesApi.listar({
      texto: '  juana ',
      especialidadId: 2,
      bloqueado: true,
      pagina: 2,
      porPagina: 20,
    });
    expect(p[0]).toMatchObject({ method: 'get', url: '/files' });
    expect(p[0].params).toEqual({ texto: 'juana', especialidadId: 2, bloqueado: true, pagina: 2, porPagina: 20 });
    expect(r.total).toBe(21);

    const vacia = capturar(200, { datos: [], pagina: 1, porPagina: 50, total: 0 });
    await filesApi.listar({ texto: ' ' });
    expect(vacia[0].params).toEqual({});
  });

  it('obtener, crear, editar y especialidades van a sus rutas', async () => {
    let p = capturar(200, detalle);
    await filesApi.obtener(12);
    expect(p[0]).toMatchObject({ method: 'get', url: '/files/12' });

    p = capturar(201, detalle);
    const datos: DatosCrearFile = { ...detalle, fechaNacimiento: null };
    await filesApi.crear(datos, actor);
    expect(p[0]).toMatchObject({ method: 'post', url: '/files' });
    expect(JSON.parse(p[0].data as string)).toMatchObject({ ci: '7654321', codigo: 'EST-2024-015' });

    p = capturar(200, detalle);
    await filesApi.editar(12, { celular: '71234567' }, actor);
    expect(p[0]).toMatchObject({ method: 'patch', url: '/files/12' });
    expect(JSON.parse(p[0].data as string)).toEqual({ celular: '71234567' });

    p = capturar(200, [{ id: 1, nombre: 'Matemática' }]);
    expect(await filesApi.especialidades()).toEqual([{ id: 1, nombre: 'Matemática' }]);
    expect(p[0]).toMatchObject({ method: 'get', url: '/catalogos/especialidades' });
  });

  it('bloquear y desbloquear van a sus rutas con su cuerpo (S2.6)', async () => {
    let p = capturar(200, { ...detalle, bloqueado: true });
    await filesApi.bloquear(12, 'Permiso obligatorio', actor);
    expect(p[0]).toMatchObject({ method: 'post', url: '/files/12/bloqueo' });
    expect(JSON.parse(p[0].data as string)).toEqual({ motivo: 'Permiso obligatorio' });
    p = capturar(200, detalle);
    await filesApi.desbloquear(12, 'RA-045/2026', actor);
    expect(p[0]).toMatchObject({ method: 'post', url: '/files/12/desbloqueo' });
    expect(JSON.parse(p[0].data as string)).toEqual({ resolucion: 'RA-045/2026' });
  });

  it('los errores de la API llegan como ErrorApi con su código', async () => {
    capturar(409, { error: { code: 'CODIGO_EXISTENTE', message: 'Ya existe un file con ese código de estudiante.' } });
    await expect(filesApi.crear({ ...detalle }, actor)).rejects.toMatchObject({
      codigo: 'CODIGO_EXISTENTE',
      estado: 409,
    } satisfies Partial<ErrorApi>);
  });
});
