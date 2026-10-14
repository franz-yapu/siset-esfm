import { afterAll, describe, expect, it } from 'vitest';
import { clienteDeTest } from './utilidades';

const bd = clienteDeTest();
afterAll(() => bd.$disconnect());

describe('parametro (SDD S1.1 §2.2, DEC-010)', () => {
  it('una base recién migrada tiene los parámetros de login y de sesión', async () => {
    const filas = await bd.parametro.findMany({ orderBy: { clave: 'asc' }, select: { clave: true, valor: true } });
    expect(filas).toEqual([
      { clave: 'MAX_INTENTOS_LOGIN', valor: '5' },
      { clave: 'MIN_BLOQUEO_LOGIN', valor: '15' },
      { clave: 'SEG_GRACIA_REFRESH', valor: '10' },
    ]);
  });

  it('updated_at cambia al actualizar un parámetro', async () => {
    const antes = await bd.parametro.findUniqueOrThrow({ where: { clave: 'MIN_BLOQUEO_LOGIN' } });
    const despues = await bd.parametro.update({ where: { clave: 'MIN_BLOQUEO_LOGIN' }, data: { valor: '15' } });
    expect(despues.updatedAt.getTime()).toBeGreaterThan(antes.updatedAt.getTime());
  });
});
