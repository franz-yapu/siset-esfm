import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
beforeAll(() => sembrar(bd, KARDEX_DE_PRUEBA));
afterAll(() => bd.$disconnect());

describe('migraciones del modelo v1 (SDD S0.11, S1.1)', () => {
  it('crea exactamente las 8 tablas: las 6 de S0.11 más parametro y refresh_token (S1.1)', async () => {
    const filas = await bd.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name`;
    expect(filas.map((f) => f.table_name)).toEqual([
      'especialidad',
      'log_auditoria',
      'parametro',
      'persona',
      'refresh_token',
      'rol',
      'sede',
      'usuario',
    ]);
  });

  it('ningún id es BIGINT (DEC-006)', async () => {
    const columnas = await bd.$queryRaw<{ columna: string; data_type: string }[]>`
      SELECT table_name || '.' || column_name AS columna, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
        AND (column_name = 'id' OR column_name LIKE '%\_id' ESCAPE '\')
        AND column_name <> 'entidad_id'`;
    expect(columnas.length).toBeGreaterThanOrEqual(10);
    expect(columnas.filter((c) => c.data_type !== 'integer')).toEqual([]);
  });

  it('todas las FK son RESTRICT, salvo refresh_token.usuario_id: CASCADE al borrar (DEC-006)', async () => {
    const fks = await bd.$queryRaw<{ conname: string; del: string; upd: string }[]>`
      SELECT conname, confdeltype::text AS del, confupdtype::text AS upd FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace`;
    expect(fks.length).toBe(5);
    const excepcion = 'refresh_token_usuario_id_fkey';
    expect(fks.find((fk) => fk.conname === excepcion)).toMatchObject({ del: 'c', upd: 'r' });
    expect(fks.filter((fk) => fk.conname !== excepcion && (fk.del !== 'r' || fk.upd !== 'r'))).toEqual([]);
  });

  it('impide duplicar un CI sin complemento y permite complementos distintos (E1)', async () => {
    await bd.persona.create({ data: { ci: '5550001', nombres: 'Ana', apellidoPaterno: 'Mamani' } });
    await expect(
      bd.persona.create({ data: { ci: '5550001', nombres: 'Otra', apellidoPaterno: 'X' } }),
    ).rejects.toThrow();
    await bd.persona.create({
      data: { ci: '5550001', complemento: '1A', nombres: 'Con', apellidoPaterno: 'Complemento' },
    });
    expect(await bd.persona.count({ where: { ci: '5550001' } })).toBe(2);
  });

  it('rechaza una persona sin ningún apellido', async () => {
    await expect(bd.persona.create({ data: { ci: '5550002', nombres: 'Sin Apellidos' } })).rejects.toThrow(
      /ck_persona_apellido/,
    );
  });

  it('la bitácora acepta usuario NULL e IPv6, y rechaza una IP inválida', async () => {
    await bd.logAuditoria.create({ data: { accion: 'LOGIN_FALLIDO', modulo: 'AUTH', ip: '2001:db8::1' } });
    await expect(
      bd.logAuditoria.create({ data: { accion: 'LOGIN_FALLIDO', modulo: 'AUTH', ip: 'no-es-ip' } }),
    ).rejects.toThrow();
  });

  it('la bitácora es de solo inserción: UPDATE, DELETE y TRUNCATE fallan (E2, ADR-0003)', async () => {
    const antes = await bd.logAuditoria.count();
    expect(antes).toBeGreaterThan(0);
    await expect(bd.$executeRaw`UPDATE log_auditoria SET accion = 'X'`).rejects.toThrow(/solo inserción/);
    await expect(bd.$executeRaw`DELETE FROM log_auditoria`).rejects.toThrow(/solo inserción/);
    await expect(bd.$executeRaw`TRUNCATE log_auditoria`).rejects.toThrow(/solo inserción/);
    expect(await bd.logAuditoria.count()).toBe(antes);
  });

  it('impide borrar un rol que tiene usuarios', async () => {
    await expect(bd.rol.delete({ where: { codigo: 'KARDEX' } })).rejects.toThrow();
    expect(await bd.rol.count({ where: { codigo: 'KARDEX' } })).toBe(1);
  });

  it('una conexión nueva usa la zona America/La_Paz', async () => {
    const [fila] = await bd.$queryRaw<{ TimeZone: string }[]>`SHOW timezone`;
    expect(fila.TimeZone).toBe('America/La_Paz');
  });
});
