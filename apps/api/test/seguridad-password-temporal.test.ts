import { describe, expect, it } from 'vitest';
import { esquemaPassword } from '@/modulos/seguridad';
import { generarPasswordTemporal, LARGO_PASSWORD_TEMPORAL } from '@/modulos/seguridad/password-temporal';

describe('generarPasswordTemporal (SDD S1.8 §2.3)', () => {
  const generadas = Array.from({ length: 200 }, generarPasswordTemporal);

  it('cumple la política de DEC-011 y tiene 12 caracteres', () => {
    for (const p of generadas) {
      expect(p).toHaveLength(LARGO_PASSWORD_TEMPORAL);
      expect(esquemaPassword.safeParse(p).success).toBe(true);
      expect(p).toMatch(/[a-z]/);
      expect(p).toMatch(/[A-Z]/);
      expect(p).toMatch(/\d/);
      expect(p).toMatch(/[#$%&*+\-=?@]/);
    }
  });

  it('no usa caracteres que se confunden al dictarla', () => {
    for (const p of generadas) expect(p).not.toMatch(/[0O1lI]/);
  });

  it('no se repiten', () => {
    expect(new Set(generadas).size).toBe(generadas.length);
  });
});
