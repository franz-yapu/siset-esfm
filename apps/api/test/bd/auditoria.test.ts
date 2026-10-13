import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conContexto } from '@/compartido/http';
import { REDACTADO, registrarEvento } from '@/modulos/auditoria';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
let usuarioId = 0;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  usuarioId = (await bd.usuario.findUniqueOrThrow({ where: { username: KARDEX_DE_PRUEBA.ci } })).id;
});
afterAll(() => bd.$disconnect());

const contexto = () => ({ idPeticion: 'req-1', ip: '198.51.100.4', userAgent: 'navegador/1', usuarioId });

describe('registrarEvento (DEC-007, SDD S0.7 §2.10)', () => {
  it('guarda usuario, IP y user agent del contexto de la petición', async () => {
    await conContexto(contexto(), () =>
      registrarEvento(bd, {
        accion: 'EDITAR',
        modulo: 'PERSONAS',
        entidad: 'persona',
        entidadId: 7,
        despues: { a: 1 },
      }),
    );
    const e = await bd.logAuditoria.findFirstOrThrow({ where: { entidad: 'persona', entidadId: '7' } });
    expect(e).toMatchObject({
      usuarioId,
      ip: '198.51.100.4',
      userAgent: 'navegador/1',
      accion: 'EDITAR',
      modulo: 'PERSONAS',
    });
    expect(e.datosDespues).toEqual({ a: 1 });
  });

  it('está en la misma transacción: si la operación falla, no queda evento (D-17)', async () => {
    const antes = await bd.logAuditoria.count();
    await expect(
      bd.$transaction(async (tx) => {
        await conContexto(contexto(), () => registrarEvento(tx, { accion: 'CREAR', modulo: 'FILES', entidad: 'file' }));
        throw new Error('la operación falló');
      }),
    ).rejects.toThrow('la operación falló');
    expect(await bd.logAuditoria.count()).toBe(antes);
  });

  it('redacta contraseñas en antes y después', async () => {
    await registrarEvento(bd, {
      accion: 'CAMBIAR_PASSWORD',
      modulo: 'SEGURIDAD',
      entidad: 'usuario',
      entidadId: 'redaccion',
      antes: { passwordHash: '$2b$12$abc' },
      despues: { passwordHash: '$2b$12$def' },
    });
    const e = await bd.logAuditoria.findFirstOrThrow({ where: { entidadId: 'redaccion' } });
    expect(e.datosAntes).toEqual({ passwordHash: REDACTADO });
    expect(JSON.stringify(e)).not.toContain('$2b$12$');
  });

  it('fuera de una petición deja usuario, IP y user agent en NULL; un usuarioId explícito gana', async () => {
    await registrarEvento(bd, { accion: 'LOGIN_FALLIDO', modulo: 'SEGURIDAD', entidadId: 'sin-contexto' });
    expect(await bd.logAuditoria.findFirstOrThrow({ where: { entidadId: 'sin-contexto' } })).toMatchObject({
      usuarioId: null,
      ip: null,
      userAgent: null,
    });
    await conContexto({ ...contexto(), usuarioId: null }, () =>
      registrarEvento(bd, { accion: 'LOGIN', modulo: 'SEGURIDAD', entidadId: 'explicito', usuarioId }),
    );
    expect((await bd.logAuditoria.findFirstOrThrow({ where: { entidadId: 'explicito' } })).usuarioId).toBe(usuarioId);
  });
});
