import { jwtVerify } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { buscarNombreCompleto } from '@/modulos/personas';
import { hashPassword } from '@/modulos/seguridad';
import { hashDeToken } from '@/modulos/seguridad/token';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest } from './utilidades';
import { sembrar } from '../../prisma/semilla';
import { KARDEX_DE_PRUEBA } from './utilidades';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
const PASSWORD = 'clave-1234';
const ERROR_401 = { error: { code: 'CREDENCIALES_INVALIDAS', message: 'CI o contraseña incorrectos.' } };

let anaId = 0;

/** Crea un usuario SEC_DIR de La Paz con la contraseña de prueba. */
async function crearUsuario(ci: string, complemento = '', extra: Record<string, unknown> = {}) {
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'SEC_DIR' } });
  const sede = await bd.sede.findUniqueOrThrow({ where: { codigo: 'LA_PAZ' } });
  const persona = await bd.persona.create({
    data: { ci, complemento, nombres: 'Ana', apellidoPaterno: 'Mamani', apellidoMaterno: 'Quispe' },
  });
  return bd.usuario.create({
    data: {
      personaId: persona.id,
      rolId: rol.id,
      sedeId: sede.id,
      username: complemento ? `${ci}-${complemento}` : ci,
      passwordHash: await hashPassword(PASSWORD),
      debeCambiarPassword: false,
      ...extra,
    },
  });
}

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  anaId = (await crearUsuario('6660001')).id;
  await crearUsuario('6660002', '1A');
  await crearUsuario('6660003', '', { activo: false });
  await crearUsuario('6660004', '', { bloqueadoHasta: new Date(Date.now() + 10 * 60_000) });
  await crearUsuario('6660005', '', { bloqueadoHasta: new Date(Date.now() - 60_000) });
});
afterAll(() => bd.$disconnect());

const login = (usuario: string, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').set('User-Agent', 'navegador-prueba/1').send({ usuario, password });

const ultimoEvento = () => bd.logAuditoria.findFirstOrThrow({ orderBy: { id: 'desc' } });

describe('POST /api/v1/auth/login (SDD S1.3)', () => {
  it('login correcto: 200 con el usuario; ultimoAcceso es el anterior (null la primera vez)', async () => {
    const r = await login('6660001');
    expect(r.status).toBe(200);
    expect(r.body.usuario).toEqual({
      id: anaId,
      usuario: '6660001',
      nombre: 'Ana Mamani Quispe',
      rol: 'SEC_DIR',
      sedeId: expect.any(Number),
      activo: true,
      debeCambiarPassword: false,
      ultimoAcceso: null,
    });
    const segunda = await login('6660001');
    expect(segunda.body.usuario.ultimoAcceso).toEqual(expect.any(String));
    const enBase = await bd.usuario.findUniqueOrThrow({ where: { id: anaId } });
    expect(new Date(segunda.body.usuario.ultimoAcceso).getTime()).toBeLessThan(enBase.ultimoAcceso!.getTime());
  });

  it('deja la cookie del refresh con sus atributos y guarda solo su hash, con IP, user agent y 8 h', async () => {
    const antes = Date.now();
    const r = await login('6660001');
    const cookie = ([] as string[]).concat(r.headers['set-cookie'] ?? [])[0];
    expect(cookie).toMatch(/^siset_refresh=[A-Za-z0-9_-]{43};/);
    expect(cookie).toMatch(/Max-Age=28800/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Strict/);

    const token = cookie.split(';')[0].split('=')[1];
    const fila = await bd.refreshToken.findUniqueOrThrow({ where: { tokenHash: hashDeToken(token) } });
    expect(fila).toMatchObject({ usuarioId: anaId, userAgent: 'navegador-prueba/1', revocadoEn: null });
    expect(fila.ip).toEqual(expect.any(String));
    expect(await bd.refreshToken.count({ where: { tokenHash: token } })).toBe(0);
    const ocho = 8 * 60 * 60_000;
    expect(fila.expiraEn.getTime()).toBeGreaterThanOrEqual(antes + ocho - 1000);
    expect(fila.expiraEn.getTime()).toBeLessThanOrEqual(Date.now() + ocho);
  });

  it('el access token es un JWT HS256 de 15 min con sub, rol, sede y cpw', async () => {
    const r = await login('6660001');
    const { payload, protectedHeader } = await jwtVerify(
      r.body.accessToken,
      new TextEncoder().encode(SECRETO_JWT_DE_PRUEBA),
      { issuer: 'siset' },
    );
    expect(protectedHeader.alg).toBe('HS256');
    expect(payload).toMatchObject({ sub: String(anaId), rol: 'SEC_DIR', sede: r.body.usuario.sedeId, cpw: false });
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
    expect(new Date(r.body.expiraEn).getTime()).toBe(payload.exp! * 1000);
  });

  it('registra LOGIN en la bitácora a nombre del usuario', async () => {
    await login('6660001');
    expect(await ultimoEvento()).toMatchObject({
      accion: 'LOGIN',
      modulo: 'SEGURIDAD',
      usuarioId: anaId,
      entidadId: String(anaId),
      userAgent: 'navegador-prueba/1',
    });
  });

  it('contraseña incorrecta: 401 genérico, LOGIN_FALLIDO PASSWORD_INCORRECTA y ninguna sesión nueva', async () => {
    const sesiones = await bd.refreshToken.count({ where: { usuarioId: anaId } });
    const r = await login('6660001', 'otra-1234');
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR_401);
    expect(r.headers['set-cookie']).toBeUndefined();
    expect(await ultimoEvento()).toMatchObject({
      accion: 'LOGIN_FALLIDO',
      usuarioId: anaId,
      datosDespues: { motivo: 'PASSWORD_INCORRECTA', intentosFallidos: 0 },
    });
    expect(await bd.refreshToken.count({ where: { usuarioId: anaId } })).toBe(sesiones);
  });

  it('CI inexistente: el mismo 401 y ningún evento en la bitácora (D-26)', async () => {
    const eventos = await bd.logAuditoria.count();
    const r = await login('9999999');
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR_401);
    expect(await bd.logAuditoria.count()).toBe(eventos);
  });

  it('cuenta inactiva con contraseña correcta: el mismo 401 y CUENTA_INACTIVA', async () => {
    const r = await login('6660003');
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR_401);
    expect((await ultimoEvento()).datosDespues).toMatchObject({ motivo: 'CUENTA_INACTIVA' });
  });

  it('cuenta bloqueada con contraseña correcta: el mismo 401 y CUENTA_BLOQUEADA; con el bloqueo vencido entra', async () => {
    const r = await login('6660004');
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR_401);
    expect((await ultimoEvento()).datosDespues).toMatchObject({ motivo: 'CUENTA_BLOQUEADA' });
    expect((await login('6660005')).status).toBe(200);
  });

  it('con contraseña incorrecta, una cuenta bloqueada anota PASSWORD_INCORRECTA', async () => {
    await login('6660004', 'otra-1234');
    expect((await ultimoEvento()).datosDespues).toMatchObject({ motivo: 'PASSWORD_INCORRECTA' });
  });

  it('el usuario se busca en mayúsculas y sin espacios: " 6660002-1a " encuentra 6660002-1A', async () => {
    const r = await login(' 6660002-1a ');
    expect(r.status).toBe(200);
    expect(r.body.usuario.usuario).toBe('6660002-1A');
  });

  it.each([
    ['sin password', { usuario: '6660001' }],
    ['password de 201 caracteres', { usuario: '6660001', password: 'a'.repeat(201) }],
    ['usuario vacío', { usuario: '   ', password: PASSWORD }],
  ])('400 VALIDACION: %s', async (_caso, cuerpo) => {
    const r = await request(app).post('/api/v1/auth/login').send(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });

  it('si falla la creación de la sesión, no quedan LOGIN ni ultimo_acceso nuevos (D-17)', async () => {
    await bd.$executeRawUnsafe(`
      CREATE FUNCTION test_falla_sesion() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'sesión rechazada por el test'; END $$`);
    await bd.$executeRawUnsafe(
      `CREATE TRIGGER test_falla_sesion BEFORE INSERT ON refresh_token FOR EACH ROW EXECUTE FUNCTION test_falla_sesion()`,
    );
    try {
      const antes = await bd.usuario.findUniqueOrThrow({ where: { id: anaId } });
      const eventos = await bd.logAuditoria.count();
      expect((await login('6660001')).status).toBe(500);
      expect(await bd.logAuditoria.count()).toBe(eventos);
      expect((await bd.usuario.findUniqueOrThrow({ where: { id: anaId } })).ultimoAcceso).toEqual(antes.ultimoAcceso);
    } finally {
      await bd.$executeRawUnsafe('DROP TRIGGER test_falla_sesion ON refresh_token');
      await bd.$executeRawUnsafe('DROP FUNCTION test_falla_sesion()');
    }
  });

  it('el documento OpenAPI tiene POST /api/v1/auth/login con 200, 400 y 401', async () => {
    const r = await request(app).get('/api/v1/openapi.json');
    expect(Object.keys(r.body.paths['/api/v1/auth/login'].post.responses)).toEqual(['200', '400', '401']);
  });
});

describe('buscarNombreCompleto (SDD S1.3 §2.5)', () => {
  it('omite los apellidos que faltan', async () => {
    const p = await bd.persona.create({ data: { ci: '6660099', nombres: 'Luis', apellidoMaterno: 'Choque' } });
    expect(await buscarNombreCompleto(bd, p.id)).toBe('Luis Choque');
  });
});
