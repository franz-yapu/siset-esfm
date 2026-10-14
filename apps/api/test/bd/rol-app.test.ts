import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
beforeAll(() => sembrar(bd, KARDEX_DE_PRUEBA));
afterAll(() => bd.$disconnect());

/** Corre `sql` como siset_app dentro de una transacción que siempre se deshace. */
async function comoApp(sql: string): Promise<void> {
  await bd
    .$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE siset_app');
      await tx.$executeRawUnsafe(sql);
      throw new Error('__deshacer__');
    })
    .catch((e: unknown) => {
      if ((e as Error).message !== '__deshacer__') throw e;
    });
}

describe('rol siset_app (SDD S6.4 §2.1, ADR-0003 §2)', () => {
  it('existe y no puede entrar hasta que el despliegue le ponga contraseña', async () => {
    const [rol] = await bd.$queryRaw<{ rolname: string }[]>`SELECT rolname FROM pg_roles WHERE rolname = 'siset_app'`;
    expect(rol?.rolname).toBe('siset_app');
  });

  it('puede insertar y leer la bitácora', async () => {
    await expect(
      comoApp(`INSERT INTO log_auditoria (accion, modulo) VALUES ('LOGIN', 'SEGURIDAD')`),
    ).resolves.toBeUndefined();
    await expect(comoApp('SELECT count(*) FROM log_auditoria')).resolves.toBeUndefined();
  });

  it.each([
    ['UPDATE', `UPDATE log_auditoria SET accion = 'X'`],
    ['DELETE', 'DELETE FROM log_auditoria'],
    ['TRUNCATE', 'TRUNCATE log_auditoria'],
  ])('no puede hacer %s en la bitácora: permiso denegado, antes del trigger', async (_op, sql) => {
    await expect(comoApp(sql)).rejects.toThrow(/permission denied|permiso denegado/i);
  });

  it('puede escribir en las tablas de negocio', async () => {
    await expect(comoApp(`UPDATE usuario SET intentos_fallidos = 0`)).resolves.toBeUndefined();
    await expect(comoApp(`DELETE FROM refresh_token WHERE false`)).resolves.toBeUndefined();
  });

  it('no puede leer _prisma_migrations', async () => {
    await expect(comoApp('SELECT count(*) FROM _prisma_migrations')).rejects.toThrow(
      /permission denied|permiso denegado/i,
    );
  });

  it('una tabla creada después por el dueño queda con permisos para siset_app (privilegios por defecto)', async () => {
    await bd.$executeRawUnsafe('CREATE TABLE prueba_privilegios (id SERIAL PRIMARY KEY, x INT)');
    try {
      await expect(comoApp('INSERT INTO prueba_privilegios (x) VALUES (1)')).resolves.toBeUndefined();
    } finally {
      await bd.$executeRawUnsafe('DROP TABLE prueba_privilegios');
    }
  });
});
