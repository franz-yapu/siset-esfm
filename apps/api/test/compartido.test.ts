import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { cargarConfig } from '@/compartido/config';
import { crearLogger } from '@/compartido/logger';
import { redactar, REDACTADO } from '@/modulos/auditoria';

const SECRETO = 'x'.repeat(32);

describe('cargarConfig', () => {
  it('falla nombrando la variable que falta, sin mostrar valores', () => {
    expect(() => cargarConfig({ CORS_ORIGEN: 'http://x' })).toThrow(/DATABASE_URL/);
  });

  it('rechaza una DATABASE_URL que no es de PostgreSQL sin mostrarla', () => {
    let mensaje = '';
    try {
      cargarConfig({ DATABASE_URL: 'mysql://usuario:clave@host/db', JWT_SECRET: SECRETO });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/DATABASE_URL/);
    expect(mensaje).not.toContain('clave');
  });

  it('aplica los valores por defecto', () => {
    expect(cargarConfig({ DATABASE_URL: 'postgresql://u:p@localhost:5432/siset', JWT_SECRET: SECRETO })).toEqual({
      entorno: 'development',
      puerto: 3000,
      databaseUrl: 'postgresql://u:p@localhost:5432/siset',
      corsOrigen: ['http://localhost:5173'],
      trustProxy: 0,
      nivelLog: 'info',
      jsonLimite: '100kb',
      jwtSecreto: SECRETO,
    });
  });

  it('acepta varios orígenes de CORS separados por coma', () => {
    const c = cargarConfig({
      DATABASE_URL: 'postgresql://localhost/siset',
      CORS_ORIGEN: 'https://a.bo, https://b.bo',
      JWT_SECRET: SECRETO,
    });
    expect(c.corsOrigen).toEqual(['https://a.bo', 'https://b.bo']);
  });

  it('exige JWT_SECRET de 32 caracteres o más, sin mostrar su valor (SDD S1.3 §2.3)', () => {
    const base = { DATABASE_URL: 'postgresql://localhost/siset' };
    expect(() => cargarConfig(base)).toThrow(/JWT_SECRET/);
    let mensaje = '';
    try {
      cargarConfig({ ...base, JWT_SECRET: 'secreto-corto-visible' });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/JWT_SECRET/);
    expect(mensaje).not.toContain('secreto-corto-visible');
  });
});

describe('logger', () => {
  it('nunca escribe contraseñas ni tokens (RNF-01)', () => {
    const lineas: string[] = [];
    const destino = new Writable({
      write(chunk: Buffer, _enc, cb) {
        lineas.push(chunk.toString());
        cb();
      },
    });
    const logger = crearLogger({ nivelLog: 'info' }, destino);
    logger.info({ usuario: { ci: '123', password: 'secreta1', refreshToken: 'tok' } }, 'prueba');
    const salida = lineas.join('');
    expect(salida).not.toContain('secreta1');
    expect(salida).not.toContain('"tok"');
    expect(salida).toContain('[Redacted]');
  });
});

describe('redactar (auditoría)', () => {
  it('oculta claves sensibles a cualquier profundidad y serializa fechas', () => {
    const fecha = new Date('2026-10-13T12:00:00.000Z');
    expect(redactar({ ci: '1', passwordHash: 'h', datos: [{ nuevaPassword: 'x', tokenHash: 't' }], fecha })).toEqual({
      ci: '1',
      passwordHash: REDACTADO,
      datos: [{ nuevaPassword: REDACTADO, tokenHash: REDACTADO }],
      fecha: '2026-10-13T12:00:00.000Z',
    });
  });

  it('undefined queda undefined', () => {
    expect(redactar(undefined)).toBeUndefined();
  });
});
