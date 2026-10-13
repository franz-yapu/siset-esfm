import { describe, expect, it } from 'vitest';
import { crearClienteBd } from '@/compartido/bd';
import { leerKardexInicial } from '../prisma/semilla';

describe('leerKardexInicial', () => {
  const valido = { SEED_KARDEX_CI: '1000001', SEED_KARDEX_PASSWORD: 'clave1234' };

  it('falla con un mensaje claro si falta la contraseña', () => {
    expect(() => leerKardexInicial({ SEED_KARDEX_CI: '1000001' })).toThrow(/SEED_KARDEX_PASSWORD/);
  });

  it('falla si falta el CI', () => {
    expect(() => leerKardexInicial({ SEED_KARDEX_PASSWORD: 'clave1234' })).toThrow(/SEED_KARDEX_CI/);
  });

  it.each(['corta1', 'soloLetrasLargas', '12345678'])('rechaza la contraseña débil %s sin mostrarla', (clave) => {
    expect(() => leerKardexInicial({ ...valido, SEED_KARDEX_PASSWORD: clave })).toThrow(
      /mínimo 8 caracteres, con letras y números/,
    );
    try {
      leerKardexInicial({ ...valido, SEED_KARDEX_PASSWORD: clave });
    } catch (e) {
      expect((e as Error).message).not.toContain(clave);
    }
  });

  it('usa nombres por defecto', () => {
    expect(leerKardexInicial(valido)).toEqual({
      ci: '1000001',
      password: 'clave1234',
      nombres: 'Kardex',
      apellidos: 'Inicial',
    });
  });
});

describe('crearClienteBd', () => {
  it('sin URL lanza un error', () => {
    expect(() => crearClienteBd('')).toThrow(/DATABASE_URL/);
  });
});
