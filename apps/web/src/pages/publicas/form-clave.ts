import { ErrorApi } from '@/lib/errores';
import { validarClave } from '@/lib/reglas';

// Reglas y errores del formulario de cambio de contraseña (SDD S1.9 §2.2). Puras para probarlas sin DOM.

export interface CamposClave {
  passwordActual: string;
  passwordNueva: string;
  passwordRepetida: string;
}

export type ErroresClave = Partial<Record<keyof CamposClave, string>>;

/** Mismo texto que la API (SDD S1.5) para que el usuario vea un solo mensaje, venga de donde venga. */
export const MENSAJE_IGUAL_A_LA_ACTUAL = 'La nueva contraseña debe ser distinta de la actual';

/** Errores por campo antes de enviar; un objeto vacío si se puede enviar. */
export function validarFormClave({ passwordActual, passwordNueva, passwordRepetida }: CamposClave): ErroresClave {
  const errores: ErroresClave = {};
  if (!passwordActual) errores.passwordActual = 'Ingresa tu contraseña actual';
  const nueva =
    validarClave(passwordNueva) ??
    (passwordActual && passwordNueva === passwordActual ? MENSAJE_IGUAL_A_LA_ACTUAL : null);
  if (nueva) errores.passwordNueva = nueva;
  if (passwordNueva !== passwordRepetida) errores.passwordRepetida = 'Las contraseñas no coinciden';
  return errores;
}

interface Problema {
  ruta: string;
  mensaje: string;
}

const esProblema = (x: unknown): x is Problema =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as Record<string, unknown>).ruta === 'string' &&
  typeof (x as Record<string, unknown>).mensaje === 'string';

const CAMPO_DE_RUTA: Record<string, keyof CamposClave> = {
  'body.passwordActual': 'passwordActual',
  'body.passwordNueva': 'passwordNueva',
};

/**
 * Lleva el error de la API al campo que corresponde. Lo que no tiene campo (429, sin conexión,
 * otro 400) vuelve en `general` para mostrarlo en un toast.
 */
export function erroresPorCampo(e: unknown): { campos: ErroresClave; general: string | null } {
  if (!(e instanceof ErrorApi)) {
    return { campos: {}, general: e instanceof Error ? e.message : 'Ocurrió un error inesperado.' };
  }
  if (e.codigo === 'PASSWORD_ACTUAL_INCORRECTA') return { campos: { passwordActual: e.message }, general: null };
  if (e.codigo === 'VALIDACION' && Array.isArray(e.detalles)) {
    const campos: ErroresClave = {};
    for (const p of e.detalles) {
      const campo = esProblema(p) ? CAMPO_DE_RUTA[p.ruta] : undefined;
      if (campo && esProblema(p)) campos[campo] ??= p.mensaje;
    }
    if (Object.keys(campos).length > 0) return { campos, general: null };
  }
  return { campos: {}, general: e.message };
}
