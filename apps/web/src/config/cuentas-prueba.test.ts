import { describe, expect, it } from 'vitest';
import { validarClave } from '@/lib/reglas';
import { CUENTAS_PRUEBA, mostrarCuentasPrueba, PASSWORD_PRUEBA } from './cuentas-prueba';

describe('cuentas de prueba del login (SDD S0.12 §2.5)', () => {
  it('solo se muestran con VITE_CUENTAS_PRUEBA=true', () => {
    expect(mostrarCuentasPrueba('true')).toBe(true);
    expect(mostrarCuentasPrueba(undefined)).toBe(false);
    expect(mostrarCuentasPrueba('false')).toBe(false);
    expect(mostrarCuentasPrueba('1')).toBe(false);
  });

  it('la contraseña común cumple la política de DEC-011', () => {
    expect(validarClave(PASSWORD_PRUEBA)).toBeNull();
  });

  it('una cuenta por rol del personal y un estudiante (S2.7, DEC-043); sin egresados (D-08, DEC-032)', () => {
    expect(CUENTAS_PRUEBA.map((c) => c.rol).sort()).toEqual([
      'COORDINADOR',
      'ESTUDIANTE',
      'KARDEX',
      'SEC_COORD',
      'SEC_DIR',
    ]);
    expect(new Set(CUENTAS_PRUEBA.map((c) => c.usuario)).size).toBe(CUENTAS_PRUEBA.length);
  });
});
