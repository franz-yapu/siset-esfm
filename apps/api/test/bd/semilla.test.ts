import bcrypt from 'bcryptjs';
import { afterAll, describe, expect, it } from 'vitest';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
afterAll(() => bd.$disconnect());

describe('seed (SDD S0.6 §2.5)', () => {
  it('es idempotente: dos corridas dejan los mismos conteos', async () => {
    const primera = await sembrar(bd, KARDEX_DE_PRUEBA);
    const segunda = await sembrar(bd, KARDEX_DE_PRUEBA);
    expect(primera).toEqual({ roles: 6, sedes: 2, especialidades: 5, usuarios: 1 });
    expect(segunda).toEqual(primera);
  });

  it('no pisa la contraseña de un Kardex que ya existe', async () => {
    const antes = await bd.usuario.findUniqueOrThrow({ where: { ci: KARDEX_DE_PRUEBA.ci } });
    await sembrar(bd, { ...KARDEX_DE_PRUEBA, password: 'otraClave999' });
    const despues = await bd.usuario.findUniqueOrThrow({ where: { ci: KARDEX_DE_PRUEBA.ci } });
    expect(despues.passwordHash).toBe(antes.passwordHash);
  });

  it('guarda la contraseña con bcrypt costo 12 (RNF-01)', async () => {
    const kardex = await bd.usuario.findUniqueOrThrow({
      where: { ci: KARDEX_DE_PRUEBA.ci },
      include: { rol: true },
    });
    expect(kardex.rol.codigo).toBe('KARDEX');
    expect(kardex.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    expect(await bcrypt.compare(KARDEX_DE_PRUEBA.password, kardex.passwordHash)).toBe(true);
  });
});
