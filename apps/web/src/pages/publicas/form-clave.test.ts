import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/lib/errores';
import { erroresPorCampo, MENSAJE_IGUAL_A_LA_ACTUAL, validarFormClave } from './form-clave';

const ok = { passwordActual: 'temporal-1.', passwordNueva: 'nueva.clave-2', passwordRepetida: 'nueva.clave-2' };

describe('validarFormClave (SDD S1.9 §2.2)', () => {
  it('todo bien → sin errores', () => {
    expect(validarFormClave(ok)).toEqual({});
  });

  it('cada regla marca su campo', () => {
    expect(validarFormClave({ ...ok, passwordActual: '' })).toEqual({
      passwordActual: 'Ingresa tu contraseña actual',
    });
    expect(validarFormClave({ ...ok, passwordNueva: 'corta', passwordRepetida: 'corta' })).toEqual({
      passwordNueva: 'Debe tener al menos 8 caracteres',
    });
    expect(validarFormClave({ ...ok, passwordRepetida: 'otra' })).toEqual({
      passwordRepetida: 'Las contraseñas no coinciden',
    });
    const igual = 'igual.clave-1';
    expect(validarFormClave({ passwordActual: igual, passwordNueva: igual, passwordRepetida: igual })).toEqual({
      passwordNueva: MENSAJE_IGUAL_A_LA_ACTUAL,
    });
  });
});

describe('erroresPorCampo (SDD S1.9 §2.2)', () => {
  it('422 PASSWORD_ACTUAL_INCORRECTA → campo actual', () => {
    const e = new ErrorApi('La contraseña actual no es correcta.', 'PASSWORD_ACTUAL_INCORRECTA', 422);
    expect(erroresPorCampo(e)).toEqual({
      campos: { passwordActual: 'La contraseña actual no es correcta.' },
      general: null,
    });
  });

  it('400 VALIDACION con detalles → el campo de cada ruta', () => {
    const e = new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [
      { ruta: 'body.passwordNueva', mensaje: MENSAJE_IGUAL_A_LA_ACTUAL },
      { ruta: 'body.passwordActual', mensaje: 'Requerido' },
    ]);
    expect(erroresPorCampo(e)).toEqual({
      campos: { passwordNueva: MENSAJE_IGUAL_A_LA_ACTUAL, passwordActual: 'Requerido' },
      general: null,
    });
  });

  it('detalles con otra forma, 429 o un error cualquiera → mensaje general', () => {
    const raro = new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [{ campo: 'x' }]);
    expect(erroresPorCampo(raro)).toEqual({ campos: {}, general: 'Los datos enviados no son válidos.' });
    const limite = new ErrorApi('Demasiadas peticiones.', 'DEMASIADAS_PETICIONES', 429);
    expect(erroresPorCampo(limite)).toEqual({ campos: {}, general: 'Demasiadas peticiones.' });
    expect(erroresPorCampo(new Error('x'))).toEqual({ campos: {}, general: 'x' });
  });
});
