import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { aErrorApi, api } from './api';
import { ErrorApi, ErrorNegocio } from './errores';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
const respuesta = (status: number, data: unknown) =>
  new AxiosError('fallo', 'ERR_BAD_RESPONSE', config, {}, { status, data, statusText: '', headers: {}, config });

describe('aErrorApi (SDD S0.8 §2.1)', () => {
  it('formato único → ErrorApi con el mismo mensaje, código, estado y detalles', () => {
    const e = aErrorApi(
      respuesta(422, { error: { code: 'FILE_BLOQUEADO', message: 'El file está bloqueado.', details: { uf: 3 } } }),
    );
    expect(e).toMatchObject({
      message: 'El file está bloqueado.',
      codigo: 'FILE_BLOQUEADO',
      estado: 422,
      detalles: { uf: 3 },
    });
  });

  it('respuesta sin formato único (HTML de un 502) → ERROR_SERVIDOR', () => {
    expect(aErrorApi(respuesta(502, '<html>Bad Gateway</html>'))).toMatchObject({
      codigo: 'ERROR_SERVIDOR',
      estado: 502,
    });
  });

  it('sin respuesta → SIN_CONEXION; timeout → TIEMPO_AGOTADO', () => {
    expect(aErrorApi(new AxiosError('Network Error', 'ERR_NETWORK', config))).toMatchObject({ codigo: 'SIN_CONEXION' });
    expect(aErrorApi(new AxiosError('timeout', AxiosError.ECONNABORTED, config))).toMatchObject({
      codigo: 'TIEMPO_AGOTADO',
    });
  });

  it('ErrorApi es ErrorNegocio y Error: las pantallas lo tratan igual que al mock', () => {
    const e = aErrorApi(respuesta(409, { error: { code: 'CONFLICTO', message: 'Ya existe.' } }));
    expect(e).toBeInstanceOf(ErrorApi);
    expect(e).toBeInstanceOf(ErrorNegocio);
    expect(e).toBeInstanceOf(Error);
  });
});

describe('cliente api', () => {
  const adapterOriginal = api.defaults.adapter;
  afterEach(() => {
    api.defaults.adapter = adapterOriginal;
  });

  it('usa /api/v1 y envía cookies', () => {
    expect(api.defaults.baseURL).toBe('/api/v1');
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('el interceptor rechaza con ErrorApi', async () => {
    const adapter: AxiosAdapter = async (c) => {
      throw new AxiosError(
        'fallo',
        'ERR_BAD_REQUEST',
        c,
        {},
        {
          status: 404,
          data: { error: { code: 'NO_ENCONTRADO', message: 'La ruta solicitada no existe.' } },
          statusText: '',
          headers: {},
          config: c,
        },
      );
    };
    api.defaults.adapter = adapter;
    await expect(api.get('/x')).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO', estado: 404 });
  });
});
