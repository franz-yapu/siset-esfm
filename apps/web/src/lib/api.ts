import axios, { AxiosError } from 'axios';
import { ErrorApi } from './errores';

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

api.interceptors.response.use(
  (r) => r,
  (e: unknown) => Promise.reject(aErrorApi(e)),
);
