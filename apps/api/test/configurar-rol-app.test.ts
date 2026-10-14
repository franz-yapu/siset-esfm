import { describe, expect, it } from 'vitest';
import { configurarRolApp } from '../prisma/configurar-rol-app';

describe('bd:rol-app (SDD S6.4 §2.1)', () => {
  it('falla con un mensaje claro sin APP_DB_PASSWORD', async () => {
    await expect(configurarRolApp({ DATABASE_URL: 'postgresql://x@localhost/x' })).rejects.toThrow(/APP_DB_PASSWORD/);
  });

  it('rechaza una contraseña corta sin mostrarla', async () => {
    const e = await configurarRolApp({
      DATABASE_URL: 'postgresql://x@localhost/x',
      APP_DB_PASSWORD: 'corta-visible',
    }).catch((x: unknown) => x as Error);
    expect(e?.message).toMatch(/16 caracteres/);
    expect(e?.message).not.toContain('corta-visible');
  });

  it('falla sin DATABASE_URL', async () => {
    await expect(configurarRolApp({ APP_DB_PASSWORD: 'x'.repeat(20) })).rejects.toThrow(/DATABASE_URL/);
  });
});
