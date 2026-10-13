import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { hashDeToken } from '@/modulos/seguridad/token';
import { configDePrueba } from '../http/utilidades';
import { clienteDeTest, cookieRefresh, crearUsuarioDePrueba, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });
let siguienteCi = 3330100;

beforeAll(() => sembrar(bd, KARDEX_DE_PRUEBA));
afterAll(() => bd.$disconnect());

async function conSesion() {
  const ci = String(siguienteCi++);
  const { id } = await crearUsuarioDePrueba(bd, ci);
  const r = await request(app).post('/api/v1/auth/login').send({ usuario: ci, password: PASSWORD_DE_PRUEBA });
  return { id, cookie: cookieRefresh(r.headers)! };
}

const conCookie = (ruta: string, cookie?: string) => {
  const r = request(app).post(`/api/v1/auth/${ruta}`);
  if (cookie !== undefined) r.set('Cookie', `siset_refresh=${cookie}`);
  return r.send();
};

describe('POST /api/v1/auth/logout (SDD S1.5 §2.3)', () => {
  it('204: revoca la sesión, borra la cookie y registra LOGOUT; después el refresh da 401', async () => {
    const { id, cookie } = await conSesion();
    const r = await conCookie('logout', cookie);
    expect(r.status).toBe(204);
    const borrada = ([] as string[]).concat(r.headers['set-cookie'] ?? []).find((c) => c.startsWith('siset_refresh='));
    expect(borrada).toMatch(/^siset_refresh=;/);
    expect(borrada).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(borrada).toMatch(/Path=\/api\/v1\/auth/);

    const fila = await bd.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashDeToken(cookie) } });
    expect(fila.revocadoEn).not.toBeNull();
    expect(await bd.logAuditoria.findFirstOrThrow({ orderBy: { id: 'desc' } })).toMatchObject({
      accion: 'LOGOUT',
      usuarioId: id,
      entidadId: String(id),
    });
    expect((await conCookie('refresh', cookie)).status).toBe(401);
  });

  it.each([
    ['sin cookie', undefined],
    ['token inventado', 'no-existe'],
  ])('%s: 204 y ningún evento', async (_caso, cookie) => {
    const eventos = await bd.logAuditoria.count();
    expect((await conCookie('logout', cookie)).status).toBe(204);
    expect(await bd.logAuditoria.count()).toBe(eventos);
  });

  it('con una sesión ya cerrada: 204 y ningún evento nuevo', async () => {
    const { cookie } = await conSesion();
    await conCookie('logout', cookie);
    const eventos = await bd.logAuditoria.count();
    expect((await conCookie('logout', cookie)).status).toBe(204);
    expect(await bd.logAuditoria.count()).toBe(eventos);
  });
});
