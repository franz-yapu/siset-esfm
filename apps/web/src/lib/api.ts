import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ErrorApi } from './errores';
import {
  borrarAccessToken,
  emitirSesion,
  guardarAccessToken,
  obtenerAccessToken,
  type RespuestaSesion,
} from './sesion';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** No dispara el refresh ante un 401 (la propia llamada de refresh). SDD S1.10 §2.3. */
    _sinReintento?: boolean;
    /** Ya se reintentó una vez tras un refresh: un segundo 401 se rechaza. */
    _reintentada?: boolean;
  }
}

interface CuerpoError {
  error?: { code?: unknown; message?: unknown; details?: unknown };
}

/** Cliente HTTP de la API (SDD S0.8 §2.1). Las cookies viajan para el refresh token (RNF-02). */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

/** Traduce cualquier fallo de Axios al error que entienden las pantallas. */
export function aErrorApi(e: unknown): ErrorApi {
  if (e instanceof ErrorApi) return e;
  if (e instanceof AxiosError) {
    if (e.code === AxiosError.ECONNABORTED || e.code === AxiosError.ETIMEDOUT) {
      return new ErrorApi('El servidor tardó demasiado en responder.', 'TIEMPO_AGOTADO');
    }
    if (!e.response) {
      return new ErrorApi('No se pudo conectar con el servidor. Revise su conexión.', 'SIN_CONEXION');
    }
    const { status, data } = e.response;
    const error = (data as CuerpoError | undefined)?.error;
    if (error && typeof error.code === 'string' && typeof error.message === 'string') {
      return new ErrorApi(error.message, error.code, status, error.details);
    }
    return new ErrorApi('El servidor respondió con un error inesperado.', 'ERROR_SERVIDOR', status);
  }
  return new ErrorApi('Ocurrió un error inesperado.', 'ERROR_DESCONOCIDO');
}

/** Nombre del Web Lock que serializa el refresh entre pestañas. */
export const BLOQUEO_REFRESH = 'siset-refresh';

let enCurso: Promise<RespuestaSesion> | null = null;

/** Ejecuta `fn` con el Web Lock si el navegador lo tiene; si no, directo. */
function conBloqueo<T>(fn: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  return locks ? locks.request(BLOQUEO_REFRESH, fn) : fn();
}

/**
 * POST /auth/refresh una sola vez a la vez (SDD S1.10 §2.3). La API trata dos refresh con la
 * misma cookie como reuso y cierra todas las sesiones (DEC-014 #3): en la pestaña se comparte la
 * promesa en curso y entre pestañas se serializa con un Web Lock, así la segunda manda la cookie
 * ya rotada por la primera.
 */
export function renovarSesion(): Promise<RespuestaSesion> {
  enCurso ??= conBloqueo(async () => {
    try {
      const { data } = await api.post<RespuestaSesion>('/auth/refresh', undefined, { _sinReintento: true });
      guardarAccessToken(data.accessToken);
      emitirSesion({ tipo: 'renovada', respuesta: data });
      return data;
    } catch (e) {
      const error = aErrorApi(e);
      // Solo un 401 significa que la sesión terminó; sin conexión, el token y la sesión siguen.
      if (error.estado === 401) borrarAccessToken();
      throw error;
    }
  }).finally(() => {
    enCurso = null;
  });
  return enCurso;
}

/** Rutas de sesión que nunca disparan el refresh: su 401 es la respuesta, no un token vencido. */
const RUTAS_SIN_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

const debeRenovar = (e: unknown): e is AxiosError & { config: InternalAxiosRequestConfig } => {
  if (!(e instanceof AxiosError) || e.response?.status !== 401 || !e.config) return false;
  const c = e.config;
  if (c._sinReintento || c._reintentada) return false;
  if (RUTAS_SIN_REFRESH.some((r) => c.url?.endsWith(r))) return false;
  return Boolean(c.headers?.get('Authorization'));
};

/** Manda el access token si hay sesión (SDD S1.3 §2.6). */
api.interceptors.request.use((c) => {
  const token = obtenerAccessToken();
  if (token) c.headers.set('Authorization', `Bearer ${token}`);
  return c;
});

/** Ante un 401 con sesión: un refresh y un solo reintento; si el refresh falla, la sesión se perdió. */
api.interceptors.response.use(
  (r) => r,
  async (e: unknown) => {
    if (!debeRenovar(e)) throw aErrorApi(e);
    const actual = obtenerAccessToken();
    // Otra petición ya renovó mientras esta viajaba con el token viejo: basta con reintentar.
    const yaRenovada = actual !== null && e.config.headers.get('Authorization') !== `Bearer ${actual}`;
    if (!yaRenovada) {
      try {
        await renovarSesion();
      } catch (falla) {
        const error = aErrorApi(falla);
        if (error.estado === 401) emitirSesion({ tipo: 'perdida' });
        throw error;
      }
    }
    return api.request({ ...e.config, _reintentada: true });
  },
);
