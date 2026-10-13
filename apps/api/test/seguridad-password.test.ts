import { describe, expect, it } from 'vitest';
import { compararPassword, esquemaPassword, hashPassword, MENSAJES_PASSWORD } from '@/modulos/seguridad';

// Tabla de casos de la política (DEC-011, SDD S1.2 §2.2). ESPEJO de la tabla de
// apps/web/src/lib/reglas.test.ts: si cambiás una, cambiá la otra.
const VALIDAS = ['abc123.!', 'cañón12#', 'Ñandú-2026', `${'ñ'.repeat(35)}1.`];
const INVALIDAS: [string, string][] = [
  ['ab1.', MENSAJES_PASSWORD.corta],
  ['abc12345', MENSAJES_PASSWORD.sinCombinar],
  ['abc.-_!?', MENSAJES_PASSWORD.sinCombinar],
  ['1234.-_!', MENSAJES_PASSWORD.sinCombinar],
  ['abc 1234', MENSAJES_PASSWORD.sinCombinar],
  [`${'ñ'.repeat(35)}1.a`, MENSAJES_PASSWORD.larga],
];

describe('política de contraseña (esquemaPassword)', () => {
  it('el caso límite válido ocupa exactamente 72 bytes y el inválido 73', () => {
    expect(Buffer.byteLength(VALIDAS[3])).toBe(72);
    expect(Buffer.byteLength(INVALIDAS[5][0])).toBe(73);
  });

  it.each(VALIDAS)('acepta %s', (clave) => {
    expect(esquemaPassword.safeParse(clave).success).toBe(true);
  });

  it.each(INVALIDAS)('rechaza %s con su mensaje', (clave, mensaje) => {
    const r = esquemaPassword.safeParse(clave);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(mensaje);
  });
});

describe('hash y comparación (bcrypt, RNF-01)', () => {
  it('usa costo 12 y un salt distinto en cada hash', async () => {
    const [a, b] = await Promise.all([hashPassword('abc123.!'), hashPassword('abc123.!')]);
    expect(a).toMatch(/^\$2[ab]\$12\$/);
    expect(a).not.toBe(b);
  });

  it('compara bien la correcta y rechaza otra', async () => {
    const hash = await hashPassword('abc123.!');
    expect(await compararPassword('abc123.!', hash)).toBe(true);
    expect(await compararPassword('abc123.?', hash)).toBe(false);
  });
});
