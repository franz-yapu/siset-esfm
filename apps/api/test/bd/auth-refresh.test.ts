import { decodeJwt } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { hashDeToken } from '@/modulos/seguridad/token';
import { configDePrueba } from '../http/utilidades';
import { clienteDeTest, cookieRefresh, crearUsuarioDePrueba, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });
const ERROR = { error: { code: 'SESION_INVALIDA', message: 'Su sesión terminó. Vuelva a iniciar sesión.' } };
let siguienteCi = 4440100;

beforeAll(() => sembrar(bd, KARDEX_DE_PRUEBA));
afterAll(() => bd.$disconnect());

/** Usuario nuevo con una sesión abierta; devuelve su id y la cookie del login. */
async function conSesion(extra = {}) {
  const ci = String(siguienteCi++);
  const { id } = await crearUsuarioDePrueba(bd, ci, extra);
  const r = await request(app).post('/api/v1/auth/login').send({ usuario: ci, password: PASSWORD_DE_PRUEBA });
  expect(r.status).toBe(200);
  return { id, ci, cookie: cookieRefresh(r.headers)! };
}

const refrescar = (cookie?: string) => {
  const r = request(app).post('/api/v1/auth/refresh');
  if (cookie !== undefined) r.set('Cookie', `siset_refresh=${cookie}`);
  return r.send();
};
const fila = (token: string) => bd.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashDeToken(token) } });
const eventosDe = (id: number) => bd.logAuditoria.findMany({ where: { usuarioId: id }, orderBy: { id: 'asc' } });

describe('POST /api/v1/auth/refresh (SDD S1.5 §2.2)', () => {
  it('rota: access y cookie nuevos, el viejo revocado y el nuevo con el mismo vencimiento', async () => {
    const { id, cookie } = await conSesion();
    const r = await refrescar(cookie);
    expect(r.status).toBe(200);
    expect(r.body.usuario).toMatchObject({ id, rol: 'SEC_DIR' });
    expect(decodeJwt(r.body.accessToken).sub).toBe(String(id));

    const nueva = cookieRefresh(r.headers)!;
    expect(nueva).not.toBe(cookie);
    const [vieja, rotada] = [await fila(cookie), await fila(nueva)];
    expect(vieja.revocadoEn).not.toBeNull();
    expect(rotada.revocadoEn).toBeNull();
    expect(rotada.expiraEn).toEqual(vieja.expiraEn);

    const maxAge = Number(/Max-Age=(\d+)/.exec(([] as string[]).concat(r.headers['set-cookie'] ?? [])[0])![1]);
    expect(maxAge).toBeLessThanOrEqual(8 * 3600);
    expect(maxAge).toBeGreaterThan(8 * 3600 - 60);
  });

  it('el access nuevo lleva el rol y cpw actuales de la base', async () => {
    const { id, cookie } = await conSesion();
    const kardex = await bd.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
    await bd.usuario.update({ where: { id }, data: { rolId: kardex.id, debeCambiarPassword: true } });
    const r = await refrescar(cookie);
    expect(decodeJwt(r.body.accessToken)).toMatchObject({ rol: 'KARDEX', cpw: true });
  });

  it('reusar un refresh rotado: 401, cookie borrada, todas las sesiones revocadas y REUSO_SESION', async () => {
    const { id, cookie } = await conSesion();
    const nueva = cookieRefresh((await refrescar(cookie)).headers)!;

    const r = await refrescar(cookie);
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR);
    expect(cookieRefresh(r.headers)).toBe('');
    expect((await fila(nueva)).revocadoEn).not.toBeNull();
    expect(await bd.refreshToken.count({ where: { usuarioId: id, revocadoEn: null } })).toBe(0);
    expect((await eventosDe(id)).at(-1)).toMatchObject({
      accion: 'REUSO_SESION',
      entidadId: String(id),
      datosDespues: { sesionesRevocadas: 1 },
    });
    expect((await refrescar(nueva)).status).toBe(401);
  });

  it('dos refresh simultáneos con el mismo token: uno gana y el otro termina en reuso', async () => {
    const { id, cookie } = await conSesion();
    const estados = (await Promise.all([refrescar(cookie), refrescar(cookie)])).map((r) => r.status).sort();
    expect(estados).toEqual([200, 401]);
    expect(await bd.refreshToken.count({ where: { usuarioId: id, revocadoEn: null } })).toBe(0);
  });

  it.each([
    ['sin cookie', undefined],
    ['cookie vacía', ''],
    ['token inventado', 'no-existe-este-token'],
  ])('%s: 401 SESION_INVALIDA sin eventos', async (_caso, cookie) => {
    const eventos = await bd.logAuditoria.count();
    const r = await refrescar(cookie);
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR);
    expect(await bd.logAuditoria.count()).toBe(eventos);
  });

  it('un refresh vencido: 401 sin eventos', async () => {
    const { cookie } = await conSesion();
    await bd.refreshToken.update({
      where: { tokenHash: hashDeToken(cookie) },
      data: { expiraEn: new Date(Date.now() - 1000) },
    });
    const eventos = await bd.logAuditoria.count();
    expect((await refrescar(cookie)).status).toBe(401);
    expect(await bd.logAuditoria.count()).toBe(eventos);
  });

  it('usuario dado de baja: 401 y sus sesiones revocadas', async () => {
    const { id, cookie } = await conSesion();
    await bd.usuario.update({ where: { id }, data: { activo: false } });
    expect((await refrescar(cookie)).status).toBe(401);
    expect(await bd.refreshToken.count({ where: { usuarioId: id, revocadoEn: null } })).toBe(0);
  });

  it('usuario bloqueado por intentos con una sesión abierta: el refresh funciona', async () => {
    const { id, cookie } = await conSesion();
    await bd.usuario.update({ where: { id }, data: { bloqueadoHasta: new Date(Date.now() + 10 * 60_000) } });
    expect((await refrescar(cookie)).status).toBe(200);
  });

  it('la rotación normal no deja eventos en la bitácora (DEC-010 #2)', async () => {
    const { cookie } = await conSesion();
    const eventos = await bd.logAuditoria.count();
    await refrescar(cookie);
    expect(await bd.logAuditoria.count()).toBe(eventos);
  });
});
