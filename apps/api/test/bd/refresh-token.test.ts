import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buscarRefreshTokenPorHash,
  crearRefreshToken,
  revocarRefreshToken,
  revocarRefreshTokensDeUsuario,
} from '@/modulos/seguridad/refresh-token.repositorio';
import { hashDeToken } from '@/modulos/seguridad/token';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
let kardexId = 0;
let otroId = 0;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  kardexId = (await bd.usuario.findUniqueOrThrow({ where: { username: KARDEX_DE_PRUEBA.ci } })).id;
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'SEC_DIR' } });
  const persona = await bd.persona.create({ data: { ci: '7770001', nombres: 'Otra', apellidoPaterno: 'Persona' } });
  otroId = (
    await bd.usuario.create({ data: { personaId: persona.id, rolId: rol.id, username: '7770001', passwordHash: 'x' } })
  ).id;
});
// Los archivos comparten la base: se borra el usuario extra para no alterar los conteos del seed.
afterAll(async () => {
  await bd.$executeRaw`DELETE FROM usuario WHERE username = '7770001'`;
  await bd.$executeRaw`DELETE FROM persona WHERE ci IN ('7770001', '7770002')`;
  await bd.$disconnect();
});

const EXPIRA = new Date('2026-10-14T20:00:00Z');
const AHORA = new Date('2026-10-14T12:00:00Z');

const nuevo = (usuarioId: number, token: string, ip: string | null = '198.51.100.4') =>
  crearRefreshToken(bd, { usuarioId, tokenHash: hashDeToken(token), expiraEn: EXPIRA, ip, userAgent: 'navegador/1' });

describe('repositorio de refresh tokens (SDD S1.1 §2.3)', () => {
  it('guarda el hash, la IP y el user agent, y lo encuentra por hash', async () => {
    const { id } = await nuevo(kardexId, 'token-a');
    const fila = await bd.refreshToken.findUniqueOrThrow({ where: { id } });
    expect(fila).toMatchObject({ usuarioId: kardexId, ip: '198.51.100.4', userAgent: 'navegador/1', revocadoEn: null });
    expect(fila.tokenHash).toBe(hashDeToken('token-a'));
    expect(await buscarRefreshTokenPorHash(bd, hashDeToken('token-a'))).toEqual({
      id,
      usuarioId: kardexId,
      expiraEn: EXPIRA,
      revocadoEn: null,
      reemplazadoPorId: null,
    });
  });

  it('acepta IPv6 y rechaza una IP inválida', async () => {
    await nuevo(kardexId, 'token-ipv6', '2001:db8::1');
    await expect(nuevo(kardexId, 'token-ip-mala', 'no-es-ip')).rejects.toThrow();
  });

  it('rechaza un token_hash duplicado', async () => {
    await nuevo(kardexId, 'token-dup');
    await expect(nuevo(otroId, 'token-dup')).rejects.toThrow();
  });

  it('token_hash es CHAR(64): un hash más corto se rellena con espacios y ya no coincide', async () => {
    const { id } = await crearRefreshToken(bd, {
      usuarioId: kardexId,
      tokenHash: 'abc',
      expiraEn: EXPIRA,
      ip: null,
      userAgent: null,
    });
    expect((await bd.refreshToken.findUniqueOrThrow({ where: { id } })).tokenHash).toHaveLength(64);
  });

  it('devuelve null si el hash no existe', async () => {
    expect(await buscarRefreshTokenPorHash(bd, hashDeToken('no-existe'))).toBeNull();
  });

  it('revoca una sola vez: la segunda devuelve false y no cambia la fecha', async () => {
    const { id } = await nuevo(kardexId, 'token-rotar');
    expect(await revocarRefreshToken(bd, id, AHORA)).toBe(true);
    expect(await revocarRefreshToken(bd, id, new Date('2026-10-14T13:00:00Z'))).toBe(false);
    expect((await buscarRefreshTokenPorHash(bd, hashDeToken('token-rotar')))?.revocadoEn).toEqual(AHORA);
  });

  it('revoca todas las sesiones activas de un usuario y no toca las de otro', async () => {
    await nuevo(otroId, 'otro-1');
    await nuevo(otroId, 'otro-2');
    const activasKardex = await bd.refreshToken.count({ where: { usuarioId: kardexId, revocadoEn: null } });

    expect(await revocarRefreshTokensDeUsuario(bd, otroId, AHORA)).toBe(2);
    expect(await revocarRefreshTokensDeUsuario(bd, otroId, AHORA)).toBe(0);
    expect(await bd.refreshToken.count({ where: { usuarioId: kardexId, revocadoEn: null } })).toBe(activasKardex);
  });

  it('borrar un usuario borra sus refresh tokens (CASCADE, DEC-006)', async () => {
    const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'EGRESADO' } });
    const persona = await bd.persona.create({ data: { ci: '7770002', nombres: 'Borrable', apellidoPaterno: 'X' } });
    const { id } = await bd.usuario.create({
      data: { personaId: persona.id, rolId: rol.id, username: '7770002', passwordHash: 'x' },
    });
    await nuevo(id, 'token-cascada');
    await bd.$executeRaw`DELETE FROM usuario WHERE id = ${id}`;
    expect(await buscarRefreshTokenPorHash(bd, hashDeToken('token-cascada'))).toBeNull();
  });
});
