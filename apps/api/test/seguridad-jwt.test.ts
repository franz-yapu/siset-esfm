import { decodeJwt, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';

const SECRETO = 'secreto-de-prueba-de-al-menos-32-caracteres';
const AHORA = new Date('2026-10-14T12:00:00.000Z');

describe('firmarAccessToken (SDD S1.3 §2.3)', () => {
  it('firma sub, rol, sede, cpw e iss, y vence a los 15 min', async () => {
    const { token, expiraEn } = await firmarAccessToken(
      { usuarioId: 7, rol: 'KARDEX', sedeId: null, debeCambiarPassword: true },
      SECRETO,
      AHORA,
    );
    expect(decodeJwt(token)).toEqual({
      sub: '7',
      rol: 'KARDEX',
      sede: null,
      cpw: true,
      iss: 'siset',
      iat: AHORA.getTime() / 1000,
      exp: AHORA.getTime() / 1000 + 900,
    });
    expect(expiraEn.toISOString()).toBe('2026-10-14T12:15:00.000Z');
  });

  it('no se verifica con otro secreto', async () => {
    const { token } = await firmarAccessToken(
      { usuarioId: 7, rol: 'KARDEX', sedeId: 1, debeCambiarPassword: false },
      SECRETO,
      new Date(),
    );
    await expect(
      jwtVerify(token, new TextEncoder().encode('otro-secreto-distinto-de-32-caracteres!')),
    ).rejects.toThrow();
  });
});
