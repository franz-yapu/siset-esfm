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
/** Lleva la revocación del token 11 s atrás: fuera de SEG_GRACIA_REFRESH (10 s). */
const fueraDeLaGracia = (token: string) =>
  bd.refreshToken.update({
    where: { tokenHash: hashDeToken(token) },
    data: { revocadoEn: new Date(Date.now() - 11_000) },
  });
const activas = (id: number) => bd.refreshToken.count({ where: { usuarioId: id, revocadoEn: null } });

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

  it('reusar un refresh rotado fuera de la gracia: 401, cookie borrada, todas las sesiones revocadas y REUSO_SESION', async () => {
    const { id, cookie } = await conSesion();
    const nueva = cookieRefresh((await refrescar(cookie)).headers)!;
    await fueraDeLaGracia(cookie);

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

  it('dos refresh simultáneos con el mismo token: los dos 200, sin reuso (DEC-026)', async () => {
    const { id, cookie } = await conSesion();
    const estados = (await Promise.all([refrescar(cookie), refrescar(cookie)])).map((r) => r.status);
    expect(estados).toEqual([200, 200]);
    expect(await bd.refreshToken.count({ where: { usuarioId: id, revocadoEn: null } })).toBe(1);
    expect((await eventosDe(id)).map((e) => e.accion)).not.toContain('REUSO_SESION');
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

describe('POST /api/v1/auth/refresh: gracia de un refresh recién rotado (SDD S1.15, DEC-026)', () => {
  it('la rotación deja al viejo apuntando a su sucesor', async () => {
    const { cookie } = await conSesion();
    const nueva = cookieRefresh((await refrescar(cookie)).headers)!;
    expect((await fila(cookie)).reemplazadoPorId).toBe((await fila(nueva)).id);
  });

  it('se pierde la respuesta y llega el viejo dentro de la ventana: 200, el sucesor revocado, mismo vencimiento, sin reuso', async () => {
    const { id, cookie } = await conSesion();
    const perdida = cookieRefresh((await refrescar(cookie)).headers)!; // el navegador nunca la guardó

    const r = await refrescar(cookie);
    expect(r.status).toBe(200);
    const nueva = cookieRefresh(r.headers)!;
    expect((await fila(perdida)).revocadoEn).not.toBeNull();
    expect((await fila(nueva)).revocadoEn).toBeNull();
    expect((await fila(nueva)).expiraEn).toEqual((await fila(cookie)).expiraEn);
    expect((await fila(cookie)).reemplazadoPorId).toBe((await fila(nueva)).id);
    expect(await activas(id)).toBe(1);
    expect((await eventosDe(id)).map((e) => e.accion)).not.toContain('REUSO_SESION');

    // Una tercera recarga rápida con la misma cookie vieja también entra.
    const otra = await refrescar(cookie);
    expect(otra.status).toBe(200);
    expect((await refrescar(cookieRefresh(otra.headers)!)).status).toBe(200);
    expect((await eventosDe(id)).map((e) => e.accion)).not.toContain('REUSO_SESION');
  });

  it('el sucesor ya se usó y llega el viejo dentro de la ventana: 200 (respuesta atrasada), la cadena apunta al nuevo', async () => {
    const { id, cookie } = await conSesion();
    const sucesor = cookieRefresh((await refrescar(cookie)).headers)!;
    const ultimo = cookieRefresh((await refrescar(sucesor)).headers)!;

    const r = await refrescar(cookie);
    expect(r.status).toBe(200);
    const nueva = cookieRefresh(r.headers)!;
    expect((await fila(ultimo)).revocadoEn).not.toBeNull();
    for (const t of [cookie, sucesor, ultimo]) expect((await fila(t)).reemplazadoPorId).toBe((await fila(nueva)).id);
    expect(await activas(id)).toBe(1);
    // La cookie que tenía la otra carga (ya revocada) también vuelve a entrar dentro de la ventana.
    expect((await refrescar(ultimo)).status).toBe(200);
    expect((await eventosDe(id)).map((e) => e.accion)).not.toContain('REUSO_SESION');
  });

  it('el sucesor ya se usó y llega el viejo fuera de la ventana: reuso', async () => {
    const { id, cookie } = await conSesion();
    const sucesor = cookieRefresh((await refrescar(cookie)).headers)!;
    expect((await refrescar(sucesor)).status).toBe(200);
    await fueraDeLaGracia(cookie);

    expect((await refrescar(cookie)).status).toBe(401);
    expect(await activas(id)).toBe(0);
    expect((await eventosDe(id)).at(-1)?.accion).toBe('REUSO_SESION');
  });

  it('cinco refresh simultáneos con el mismo token (cargas abortadas que llegan juntas): todos 200, sin reuso', async () => {
    const { id, cookie } = await conSesion();
    const estados = (await Promise.all(Array.from({ length: 5 }, () => refrescar(cookie)))).map((r) => r.status);
    expect(estados).toEqual([200, 200, 200, 200, 200]);
    expect(await activas(id)).toBe(1);
    expect((await eventosDe(id)).map((e) => e.accion)).not.toContain('REUSO_SESION');
  });

  it('la cadena terminó en un logout y llega el viejo dentro de la ventana: reuso', async () => {
    const { id, cookie } = await conSesion();
    const sucesor = cookieRefresh((await refrescar(cookie)).headers)!;
    await request(app).post('/api/v1/auth/logout').set('Cookie', `siset_refresh=${sucesor}`).send();
    expect((await refrescar(cookie)).status).toBe(401);
    expect((await eventosDe(id)).at(-1)?.accion).toBe('REUSO_SESION');
  });

  it('revocado por logout, aunque esté dentro de la ventana: reuso', async () => {
    const { id, cookie } = await conSesion();
    await request(app).post('/api/v1/auth/logout').set('Cookie', `siset_refresh=${cookie}`).send();
    expect((await refrescar(cookie)).status).toBe(401);
    expect((await eventosDe(id)).at(-1)?.accion).toBe('REUSO_SESION');
  });

  it('revocado por cambio de contraseña: reuso', async () => {
    const { id, ci, cookie } = await conSesion();
    const login = await request(app).post('/api/v1/auth/login').send({ usuario: ci, password: PASSWORD_DE_PRUEBA });
    const cambio = await request(app)
      .post('/api/v1/auth/cambiar-password')
      .set('Authorization', `Bearer ${login.body.accessToken as string}`)
      .send({ passwordActual: PASSWORD_DE_PRUEBA, passwordNueva: 'otra.clave-9' });
    expect(cambio.status).toBe(200);
    expect((await refrescar(cookie)).status).toBe(401);
    expect((await eventosDe(id)).at(-1)?.accion).toBe('REUSO_SESION');
  });

  it('usuario dado de baja con un viejo dentro de la ventana: 401 y sesiones revocadas', async () => {
    const { id, cookie } = await conSesion();
    await refrescar(cookie);
    await bd.usuario.update({ where: { id }, data: { activo: false } });
    expect((await refrescar(cookie)).status).toBe(401);
    expect(await activas(id)).toBe(0);
  });
});
