import { afterAll, describe, expect, it } from 'vitest';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
afterAll(() => bd.$disconnect());

describe('migración inicial (SDD S0.6)', () => {
  it('crea las 5 tablas con los nombres del PRD §5', async () => {
    const filas = await bd.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name`;
    expect(filas.map((f) => f.table_name)).toEqual(['especialidad', 'log_auditoria', 'rol', 'sede', 'usuario']);
  });

  it('todas las FK son ON DELETE RESTRICT y ON UPDATE RESTRICT', async () => {
    const fks = await bd.$queryRaw<{ conname: string; confdeltype: string; confupdtype: string }[]>`
      SELECT conname, confdeltype::text, confupdtype::text FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace`;
    expect(fks.length).toBeGreaterThanOrEqual(2);
    for (const fk of fks) {
      expect({ fk: fk.conname, del: fk.confdeltype, upd: fk.confupdtype }).toEqual({
        fk: fk.conname,
        del: 'r',
        upd: 'r',
      });
    }
  });

  it('impide borrar un rol que tiene usuarios', async () => {
    await sembrar(bd, KARDEX_DE_PRUEBA);
    await expect(bd.rol.delete({ where: { codigo: 'KARDEX' } })).rejects.toThrow();
    expect(await bd.rol.count({ where: { codigo: 'KARDEX' } })).toBe(1);
  });

  it('una conexión nueva usa la zona America/La_Paz', async () => {
    const [fila] = await bd.$queryRaw<{ TimeZone: string }[]>`SHOW timezone`;
    expect(fila.TimeZone).toBe('America/La_Paz');
  });
});
