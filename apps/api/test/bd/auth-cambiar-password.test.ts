import { decodeJwt } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { configDePrueba } from '../http/utilidades';
import { clienteDeTest, cookieRefresh, crearUsuarioDePrueba, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });
const NUEVA = 'nueva.clave-2';
let siguienteCi = 2220100;

beforeAll(() => sembrar(bd, KARDEX_DE_PRUEBA));
afterAll(() => bd.$disconnect());

const login = (ci: string, password = PASSWORD_DE_PRUEBA) =>
  request(app).post('/api/v1/auth/login').send({ usuario: ci, password });

async function conSesion() {
  const ci = String(siguienteCi++);
  const { id } = await crearUsuarioDePrueba(bd, ci, { debeCambiarPassword: true });
  const r = await login(ci);
  return { id, ci, access: r.body.accessToken as string, cookie: cookieRefresh(r.headers)! };
}

const cambiar = (access: string | null, cuerpo: object) => {
  const r = request(app).post('/api/v1/auth/cambiar-password');
  if (access) r.set('Authorization', `Bearer ${access}`);
  return r.send(cuerpo);
};

describe('POST /api/v1/auth/cambiar-password (SDD S1.5 §2.3)', () => {
  it('cambia la contraseña: sesión nueva con cpw false, la vieja revocada, CAMBIAR_PASSWORD', async () => {
    const { id, ci, access, cookie } = await conSesion();
    expect(decodeJwt(access).cpw).toBe(true);

    const r = await cambiar(access, { passwordActual: PASSWORD_DE_PRUEBA, passwordNueva: NUEVA });
    expect(r.status).toBe(200);
    expect(r.body.usuario.debeCambiarPassword).toBe(false);
    expect(decodeJwt(r.body.accessToken).cpw).toBe(false);
    expect(cookieRefresh(r.headers)).toBeTruthy();

    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', `siset_refresh=${cookie}`)).status).toBe(401);
    expect((await login(ci)).status).toBe(401);
    expect((await login(ci, NUEVA)).status).toBe(200);
    expect((await bd.usuario.findUniqueOrThrow({ where: { id } })).debeCambiarPassword).toBe(false);
    const evento = await bd.logAuditoria.findFirstOrThrow({ where: { accion: 'CAMBIAR_PASSWORD', usuarioId: id } });
    expect(evento).toMatchObject({ entidadId: String(id), datosAntes: null, datosDespues: null });
  });

  it('contraseña actual incorrecta: 422 y nada cambia', async () => {
    const { id, access } = await conSesion();
    const antes = await bd.usuario.findUniqueOrThrow({ where: { id } });
    const r = await cambiar(access, { passwordActual: 'otra-1234', passwordNueva: NUEVA });
    expect(r.status).toBe(422);
    expect(r.body.error).toEqual({
      code: 'PASSWORD_ACTUAL_INCORRECTA',
      message: 'La contraseña actual no es correcta.',
    });
    expect(await bd.usuario.findUniqueOrThrow({ where: { id } })).toEqual(antes);
  });

  it.each([
    ['no cumple la política', 'abc12345', 'Debe combinar letras, números y símbolos'],
    ['es igual a la actual', PASSWORD_DE_PRUEBA, 'La nueva contraseña debe ser distinta de la actual'],
  ])('la nueva %s: 400 con su mensaje', async (_caso, passwordNueva, mensaje) => {
    const { access } = await conSesion();
    const r = await cambiar(access, { passwordActual: PASSWORD_DE_PRUEBA, passwordNueva });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
    expect(JSON.stringify(r.body.error.details)).toContain(mensaje);
  });

  it.each([
    ['sin access token', null],
    ['con un access token inválido', 'no.es.un-jwt'],
  ])('%s: 401 NO_AUTENTICADO', async (_caso, access) => {
    const r = await cambiar(access, { passwordActual: PASSWORD_DE_PRUEBA, passwordNueva: NUEVA });
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('NO_AUTENTICADO');
  });

  it('OpenAPI documenta refresh, logout y cambiar-password', async () => {
    const { body } = await request(app).get('/api/v1/openapi.json');
    expect(Object.keys(body.paths['/api/v1/auth/refresh'].post.responses)).toEqual(['200', '401']);
    expect(Object.keys(body.paths['/api/v1/auth/logout'].post.responses)).toEqual(['204']);
    expect(Object.keys(body.paths['/api/v1/auth/cambiar-password'].post.responses)).toEqual([
      '200',
      '400',
      '401',
      '422',
      '429',
    ]);
  });
});
