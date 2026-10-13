import { describe, expect, it } from 'vitest';
import { fuerzaClave, validarClave } from './reglas';

// Tabla de casos de la política (DEC-011, SDD S1.2 §2.2). ESPEJO de la tabla de
// apps/api/test/seguridad-password.test.ts: si cambiás una, cambiá la otra.
const VALIDAS = ['abc123.!', 'cañón12#', 'Ñandú-2026', `${'ñ'.repeat(35)}1.`];
const INVALIDAS: [string, string][] = [
  ['ab1.', 'Debe tener al menos 8 caracteres'],
  ['abc12345', 'Debe combinar letras, números y símbolos'],
  ['abc.-_!?', 'Debe combinar letras, números y símbolos'],
  ['1234.-_!', 'Debe combinar letras, números y símbolos'],
  ['abc 1234', 'Debe combinar letras, números y símbolos'],
  [`${'ñ'.repeat(35)}1.a`, 'Es demasiado larga (máximo 72 bytes)'],
];

describe('validarClave', () => {
  it.each(VALIDAS)('acepta %s', (clave) => {
    expect(validarClave(clave)).toBeNull();
  });

  it.each(INVALIDAS)('rechaza %s con su mensaje', (clave, mensaje) => {
    expect(validarClave(clave)).toBe(mensaje);
  });
});

describe('fuerzaClave', () => {
  it('suma un punto por largo, uno por combinar y uno por 12 caracteres o más', () => {
    expect(fuerzaClave('abc')).toBe(0);
    expect(fuerzaClave('abcdefgh')).toBe(1);
    expect(fuerzaClave('abc123.!')).toBe(2);
    expect(fuerzaClave('abc123.!xyz9')).toBe(3);
  });
});
