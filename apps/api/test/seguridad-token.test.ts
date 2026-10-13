import { describe, expect, it } from 'vitest';
import { hashDeToken } from '@/modulos/seguridad/token';

describe('hashDeToken (SDD S1.1 §2.4)', () => {
  it('devuelve 64 caracteres hexadecimales', () => {
    expect(hashDeToken('un-token')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('es determinista y distingue tokens distintos', () => {
    expect(hashDeToken('a')).toBe(hashDeToken('a'));
    expect(hashDeToken('a')).not.toBe(hashDeToken('b'));
  });

  it('coincide con el SHA-256 conocido', () => {
    expect(hashDeToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
