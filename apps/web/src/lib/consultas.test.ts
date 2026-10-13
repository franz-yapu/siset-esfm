import { describe, expect, it } from 'vitest';
import { debeReintentar } from './consultas';
import { ErrorApi } from './errores';

describe('debeReintentar (SDD S0.8 §2.5)', () => {
  it('reintenta una vez si no hay conexión o el servidor falla', () => {
    expect(debeReintentar(0, new ErrorApi('sin red', 'SIN_CONEXION'))).toBe(true);
    expect(debeReintentar(0, new ErrorApi('caído', 'ERROR_SERVIDOR', 503))).toBe(true);
    expect(debeReintentar(1, new ErrorApi('sin red', 'SIN_CONEXION'))).toBe(false);
  });

  it('no reintenta errores de la petición (4xx) ni errores desconocidos', () => {
    expect(debeReintentar(0, new ErrorApi('regla', 'REGLA_NEGOCIO', 422))).toBe(false);
    expect(debeReintentar(0, new ErrorApi('no existe', 'NO_ENCONTRADO', 404))).toBe(false);
    expect(debeReintentar(0, new Error('otro'))).toBe(false);
  });
});
