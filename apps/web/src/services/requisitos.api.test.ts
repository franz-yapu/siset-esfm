import { type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import type { Usuario } from '@/types';
import { api } from '@/lib/api';
import { requisitosApi } from './requisitos.api';

const adapterOriginal = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = adapterOriginal;
});
const capturar = (data: unknown) => {
  const p: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (c) => {
    p.push(c);
    return { status: 200, data, statusText: '', headers: {}, config: c };
  };
  api.defaults.adapter = adapter;
  return p;
};

describe('requisitosApi (SDD S2.4)', () => {
  it('listar y registrar van a sus rutas', async () => {
    let p = capturar([]);
    await requisitosApi.listar(12);
    expect(p[0]).toMatchObject({ method: 'get', url: '/files/12/requisitos' });
    p = capturar({});
    const datos = {
      estado: 'COMPLETO' as const,
      fecha: '2026-08-14',
      nroDocumento: null,
      observacion: null,
      gestion: 'II/2025',
      nombreCurso: null,
      entidadEmisora: null,
    };
    await requisitosApi.registrar(12, 'MATRICULA', datos, {} as Usuario);
    expect(p[0]).toMatchObject({ method: 'put', url: '/files/12/requisitos/MATRICULA' });
    expect(JSON.parse(p[0].data as string)).toEqual(datos);
  });
});
