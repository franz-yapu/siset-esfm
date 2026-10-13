import { describe, expect, it } from 'vitest';
import { crearClienteBd } from '@/compartido/bd';
import { leerKardexInicial, usernameDe } from '../prisma/semilla';

describe('leerKardexInicial', () => {
  const valido = { SEED_KARDEX_CI: '1000001', SEED_KARDEX_PASSWORD: 'clave1234' };

  it('falla con un mensaje claro si falta la contraseña', () => {
    expect(() => leerKardexInicial({ SEED_KARDEX_CI: '1000001' })).toThrow(/SEED_KARDEX_PASSWORD/);
  });

  it('falla si falta el CI', () => {
    expect(() => leerKardexInicial({ SEED_KARDEX_PASSWORD: 'clave1234' })).toThrow(/SEED_KARDEX_CI/);
  });

  it.each(['corta1', 'soloLetrasLargas', '12345678'])('rechaza la contraseña débil %s sin mostrarla', (clave) => {
    let mensaje = '';
    try {
      leerKardexInicial({ ...valido, SEED_KARDEX_PASSWORD: clave });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/mínimo 8 caracteres, con letras y números/);
    expect(mensaje).not.toContain(clave);
  });

  it('rechaza una sede que no existe', () => {
    expect(() => leerKardexInicial({ ...valido, SEED_KARDEX_SEDE: 'ORURO' })).toThrow(/LA_PAZ, ANCOCAGUA/);
  });

  it('rechaza un complemento de más de 5 caracteres', () => {
    expect(() => leerKardexInicial({ ...valido, SEED_KARDEX_COMPLEMENTO: '123456' })).toThrow(/5 caracteres/);
  });

  it('exige al menos un apellido', () => {
    expect(() => leerKardexInicial({ ...valido, SEED_KARDEX_APELLIDO_PATERNO: '' })).toThrow(/al menos un apellido/);
    expect(
      leerKardexInicial({ ...valido, SEED_KARDEX_APELLIDO_PATERNO: '', SEED_KARDEX_APELLIDO_MATERNO: 'Mamani' }),
    ).toMatchObject({ apellidoPaterno: null, apellidoMaterno: 'Mamani' });
  });

  it('usa valores por defecto', () => {
    expect(leerKardexInicial(valido)).toEqual({
      ci: '1000001',
      complemento: '',
      password: 'clave1234',
      nombres: 'Kardex',
      apellidoPaterno: 'Inicial',
      apellidoMaterno: null,
      sede: 'ANCOCAGUA',
    });
  });
});

describe('usernameDe', () => {
  it('es el CI, con el complemento si lo hay', () => {
    expect(usernameDe('1234567', '')).toBe('1234567');
    expect(usernameDe('1234567', '1A')).toBe('1234567-1A');
  });
});

describe('crearClienteBd', () => {
  it('sin URL lanza un error', () => {
    expect(() => crearClienteBd('')).toThrow(/DATABASE_URL/);
  });
});
