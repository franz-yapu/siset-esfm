import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aErrorApi, api, renovarSesion } from './api';
import { ErrorApi, ErrorNegocio } from './errores';
import {
  borrarAccessToken,
  guardarAccessToken,
  obtenerAccessToken,
  suscribirSesion,
  type EventoSesion,
  type RespuestaSesion,
} from './sesion';

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

describe('Authorization con el access token (SDD S1.3 §2.6)', () => {
  const adapterOriginal = api.defaults.adapter;
  afterEach(() => {
    api.defaults.adapter = adapterOriginal;
    borrarAccessToken();
  });

  const cabeceraEnviada = async () => {
    let enviada: unknown;
    const adapter: AxiosAdapter = async (c) => {
      enviada = c.headers.get('Authorization');
      return { status: 200, data: {}, statusText: '', headers: {}, config: c };
    };
    api.defaults.adapter = adapter;
    await api.get('/algo');
    return enviada;
  };

  it('sin sesión no manda Authorization', async () => {
    expect(await cabeceraEnviada()).toBeUndefined();
  });

  it('con sesión manda Bearer <token>', async () => {
    guardarAccessToken('jwt-de-prueba');
    expect(await cabeceraEnviada()).toBe('Bearer jwt-de-prueba');
  });
});

describe('refresh automático ante un 401 (SDD S1.10 §2.3)', () => {
  const adapterOriginal = api.defaults.adapter;
  let soltar: () => void = () => undefined;
  afterEach(() => {
    api.defaults.adapter = adapterOriginal;
    borrarAccessToken();
    soltar();
    vi.unstubAllGlobals();
  });

  const sesionNueva = (accessToken: string): RespuestaSesion => ({
    accessToken,
    expiraEn: '2099-01-01T00:00:00.000Z',
    usuario: {
      id: 1,
      usuario: '1234567',
      nombre: 'Ana',
      rol: 'KARDEX',
      sedeId: 2,
      activo: true,
      debeCambiarPassword: false,
      ultimoAcceso: null,
    },
  });

  const falla = (c: InternalAxiosRequestConfig, status: number, code: string) =>
    new AxiosError(
      'fallo',
      'ERR_BAD_REQUEST',
      c,
      {},
      { status, data: { error: { code, message: code } }, statusText: '', headers: {}, config: c },
    );

  /**
   * API falsa: /auth/refresh responde según `refresh`; el resto da 401 salvo con el Bearer del
   * token nuevo. Registra cada petición y los eventos de sesión.
   */
  function apiFalsa(o: { refresh: 'ok' | 401 | 'sin-red'; protegida?: (c: InternalAxiosRequestConfig) => number }) {
    const llamadas: { url: string; auth: unknown }[] = [];
    const eventos: EventoSesion[] = [];
    soltar = suscribirSesion((e) => eventos.push(e));
    const adapter: AxiosAdapter = async (c) => {
      llamadas.push({ url: c.url ?? '', auth: c.headers.get('Authorization') });
      await new Promise((r) => setTimeout(r, 5));
      if (c.url === '/auth/refresh') {
        if (o.refresh === 'sin-red') throw new AxiosError('Network Error', 'ERR_NETWORK', c);
        if (o.refresh === 401) throw falla(c, 401, 'SESION_INVALIDA');
        return { status: 200, data: sesionNueva('jwt-nuevo'), statusText: '', headers: {}, config: c };
      }
      const status = o.protegida?.(c) ?? (c.headers.get('Authorization') === 'Bearer jwt-nuevo' ? 200 : 401);
      if (status !== 200) throw falla(c, status, status === 401 ? 'NO_AUTENTICADO' : 'CAMBIO_PASSWORD_REQUERIDO');
      return { status: 200, data: { url: c.url }, statusText: '', headers: {}, config: c };
    };
    api.defaults.adapter = adapter;
    const refreshes = () => llamadas.filter((l) => l.url === '/auth/refresh').length;
    return { llamadas, eventos, refreshes };
  }

  it('401 con sesión → un refresh y reintento con el Bearer nuevo', async () => {
    guardarAccessToken('jwt-viejo');
    const { llamadas, eventos, refreshes } = apiFalsa({ refresh: 'ok' });
    const r = await api.get('/x');
    expect(r.data).toEqual({ url: '/x' });
    expect(refreshes()).toBe(1);
    expect(llamadas.at(-1)).toEqual({ url: '/x', auth: 'Bearer jwt-nuevo' });
    expect(obtenerAccessToken()).toBe('jwt-nuevo');
    expect(eventos).toEqual([{ tipo: 'renovada', respuesta: sesionNueva('jwt-nuevo') }]);
  });

  it('tres 401 a la vez → un solo refresh y tres reintentos', async () => {
    guardarAccessToken('jwt-viejo');
    const { llamadas, refreshes } = apiFalsa({ refresh: 'ok' });
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(refreshes()).toBe(1);
    const reintentos = llamadas.filter((l) => l.auth === 'Bearer jwt-nuevo').map((l) => l.url);
    expect(reintentos.sort()).toEqual(['/a', '/b', '/c']);
  });

  it('dos renovarSesion seguidas (doble efecto de StrictMode) → un solo POST /auth/refresh', async () => {
    const { refreshes } = apiFalsa({ refresh: 'ok' });
    const [a, b] = await Promise.all([renovarSesion(), renovarSesion()]);
    expect(a).toBe(b);
    expect(refreshes()).toBe(1);
  });

  it('con Web Locks, el refresh corre dentro del bloqueo siset-refresh', async () => {
    const nombres: string[] = [];
    vi.stubGlobal('navigator', {
      locks: {
        request: <T>(nombre: string, fn: () => Promise<T>) => {
          nombres.push(nombre);
          return fn();
        },
      },
    });
    const { refreshes } = apiFalsa({ refresh: 'ok' });
    await renovarSesion();
    expect(nombres).toEqual(['siset-refresh']);
    expect(refreshes()).toBe(1);
  });

  it('refresh 401 → evento perdida, token borrado y rechazo con SESION_INVALIDA, sin reintento', async () => {
    guardarAccessToken('jwt-viejo');
    const { llamadas, eventos } = apiFalsa({ refresh: 401 });
    await expect(api.get('/x')).rejects.toMatchObject({ codigo: 'SESION_INVALIDA', estado: 401 });
    expect(obtenerAccessToken()).toBeNull();
    expect(eventos).toEqual([{ tipo: 'perdida' }]);
    expect(llamadas.map((l) => l.url)).toEqual(['/x', '/auth/refresh']);
  });

  it('refresh sin red → la sesión sigue: ni evento ni token borrado', async () => {
    guardarAccessToken('jwt-viejo');
    const { eventos } = apiFalsa({ refresh: 'sin-red' });
    await expect(api.get('/x')).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
    expect(obtenerAccessToken()).toBe('jwt-viejo');
    expect(eventos).toEqual([]);
  });

  it('el reintento vuelve a dar 401 → se rechaza sin un segundo refresh', async () => {
    guardarAccessToken('jwt-viejo');
    const { refreshes } = apiFalsa({ refresh: 'ok', protegida: () => 401 });
    await expect(api.get('/x')).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    expect(refreshes()).toBe(1);
  });

  it('401 sin Authorization o de /auth/login, /auth/logout → no hay refresh', async () => {
    const { refreshes } = apiFalsa({ refresh: 'ok' });
    await expect(api.get('/x')).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    guardarAccessToken('jwt-viejo');
    await expect(api.post('/auth/login')).rejects.toMatchObject({ estado: 401 });
    await expect(api.post('/auth/logout')).rejects.toMatchObject({ estado: 401 });
    expect(refreshes()).toBe(0);
  });

  it('403 CAMBIO_PASSWORD_REQUERIDO pasa tal cual', async () => {
    guardarAccessToken('jwt-viejo');
    const { refreshes } = apiFalsa({ refresh: 'ok', protegida: () => 403 });
    await expect(api.get('/x')).rejects.toMatchObject({ codigo: 'CAMBIO_PASSWORD_REQUERIDO', estado: 403 });
    expect(refreshes()).toBe(0);
  });

  it('un 401 que volvió con un token ya renovado por otra petición solo se reintenta', async () => {
    guardarAccessToken('jwt-viejo');
    let primera = true;
    const { refreshes } = apiFalsa({
      refresh: 'ok',
      // La primera petición "salió" con el token viejo y vuelve 401 cuando ya hay uno nuevo.
      protegida: (c) => {
        if (primera) {
          primera = false;
          guardarAccessToken('jwt-nuevo');
          return 401;
        }
        return c.headers.get('Authorization') === 'Bearer jwt-nuevo' ? 200 : 401;
      },
    });
    await expect(api.get('/b')).resolves.toBeTruthy();
    expect(refreshes()).toBe(0);
  });
});
