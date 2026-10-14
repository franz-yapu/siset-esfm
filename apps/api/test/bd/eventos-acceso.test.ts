import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { conContexto } from '@/compartido/http';
import {
  registrarBloqueo,
  registrarCambioPassword,
  registrarLogin,
  registrarLoginCiInexistente,
  registrarLoginFallido,
  registrarLogout,
  registrarRestablecimientoPassword,
} from '@/modulos/seguridad/eventos-acceso';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
let kardexId = 0;
let afectadoId = 0;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  kardexId = (await bd.usuario.findUniqueOrThrow({ where: { username: KARDEX_DE_PRUEBA.ci } })).id;
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'SEC_DIR' } });
  const persona = await bd.persona.create({ data: { ci: '8880001', nombres: 'Afectada', apellidoPaterno: 'X' } });
  afectadoId = (
    await bd.usuario.create({ data: { personaId: persona.id, rolId: rol.id, username: '8880001', passwordHash: 'x' } })
  ).id;
});
afterAll(() => bd.$disconnect());

const ultimo = () => bd.logAuditoria.findFirstOrThrow({ orderBy: { id: 'desc' } });

describe('eventos de acceso (SDD S1.7 §2.4)', () => {
  it.each([
    ['LOGIN', () => registrarLogin(bd, afectadoId), null],
    ['LOGOUT', () => registrarLogout(bd, afectadoId), null],
    ['CAMBIAR_PASSWORD', () => registrarCambioPassword(bd, afectadoId), null],
    [
      'LOGIN_FALLIDO',
      () => registrarLoginFallido(bd, afectadoId, 'PASSWORD_INCORRECTA', 3),
      { motivo: 'PASSWORD_INCORRECTA', intentosFallidos: 3 },
    ],
    [
      'BLOQUEO_CUENTA',
      () => registrarBloqueo(bd, afectadoId, new Date('2026-10-14T12:15:00Z')),
      { bloqueadoHasta: '2026-10-14T12:15:00.000Z' },
    ],
  ] as const)('%s guarda solo lo definido, a nombre del dueño de la cuenta', async (accion, registrar, despues) => {
    await registrar();
    const e = await ultimo();
    expect(e).toMatchObject({
      accion,
      modulo: 'SEGURIDAD',
      entidad: 'usuario',
      entidadId: String(afectadoId),
      usuarioId: afectadoId,
      datosAntes: null,
      datosDespues: despues,
    });
  });

  it('RESTABLECER_PASSWORD toma a Kardex del contexto y guarda al afectado en entidad_id', async () => {
    await conContexto({ idPeticion: 'req-r', ip: '198.51.100.9', userAgent: 'nav/1', usuarioId: kardexId }, () =>
      registrarRestablecimientoPassword(bd, afectadoId),
    );
    expect(await ultimo()).toMatchObject({
      accion: 'RESTABLECER_PASSWORD',
      usuarioId: kardexId,
      entidadId: String(afectadoId),
      ip: '198.51.100.9',
      datosAntes: null,
      datosDespues: null,
    });
  });

  it('si la transacción falla, el LOGIN no queda guardado (D-17)', async () => {
    const antes = await bd.logAuditoria.count();
    await expect(
      bd.$transaction(async (tx) => {
        await registrarLogin(tx, afectadoId);
        throw new Error('falló la creación de la sesión');
      }),
    ).rejects.toThrow('falló la creación de la sesión');
    expect(await bd.logAuditoria.count()).toBe(antes);
  });

  it('registrarLoginCiInexistente guarda usuario nulo aunque el contexto tenga uno (S1.3b)', async () => {
    await conContexto({ idPeticion: 'req-ci', ip: '198.51.100.7', userAgent: 'nav/1', usuarioId: kardexId }, () =>
      registrarLoginCiInexistente(bd, '5550000-2B'),
    );
    expect(await ultimo()).toMatchObject({
      accion: 'LOGIN_FALLIDO',
      usuarioId: null,
      entidadId: '5550000-2B',
      ip: '198.51.100.7',
      datosDespues: { motivo: 'CI_INEXISTENTE' },
    });
  });
});
