import { SignJWT, UnsecuredJWT } from 'jose';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearManejadorErrores } from '@/compartido/errores';
import { middlewareContexto, obtenerContexto } from '@/compartido/http';
import { crearLogger } from '@/compartido/logger';
import { crearAutenticar, sesionDe } from '@/modulos/seguridad';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba } from './http/utilidades';

const SECRETO = 'secreto-de-prueba-de-al-menos-32-caracteres';
const clave = new TextEncoder().encode(SECRETO);

// App mínima: autenticar + una ruta que devuelve la sesión y el usuario del contexto.
const app = express()
  .use(middlewareContexto)
  .get('/protegida', crearAutenticar(SECRETO), (_req, res) => {
    res.json({ sesion: sesionDe(res), usuarioContexto: obtenerContexto()?.usuarioId });
  })
  .use(crearManejadorErrores(crearLogger(configDePrueba())));

const pedir = (token?: string) => {
  const r = request(app).get('/protegida');
  if (token) r.set('Authorization', `Bearer ${token}`);
  return r;
};

describe('autenticar (SDD S1.5 §2.4)', () => {
  it('con un token válido deja la sesión y el usuario en el contexto', async () => {
    const { token } = await firmarAccessToken(
      { usuarioId: 9, rol: 'KARDEX', sedeId: 2, debeCambiarPassword: false },
      SECRETO,
      new Date(),
    );
    const r = await pedir(token);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      sesion: { usuarioId: 9, rol: 'KARDEX', sedeId: 2, debeCambiarPassword: false },
      usuarioContexto: 9,
    });
  });

  const base = () => new SignJWT({ rol: 'KARDEX', sede: null, cpw: false }).setSubject('9').setIssuedAt();

  it.each([
    ['sin header', async () => undefined],
    [
      'vencido',
      async () =>
        base()
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuer('siset')
          .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
          .sign(clave),
    ],
    [
      'firmado con otro secreto',
      async () =>
        base()
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuer('siset')
          .setExpirationTime('15m')
          .sign(new TextEncoder().encode('otro-secreto-distinto-de-32-caracteres!')),
    ],
    [
      'de otro emisor',
      async () => base().setProtectedHeader({ alg: 'HS256' }).setIssuer('otro').setExpirationTime('15m').sign(clave),
    ],
    [
      'con alg none',
      async () =>
        new UnsecuredJWT({ rol: 'KARDEX', sede: null, cpw: false })
          .setSubject('9')
          .setIssuer('siset')
          .setExpirationTime('15m')
          .encode(),
    ],
    [
      'con un formato inesperado (sub no numérico)',
      async () =>
        new SignJWT({ rol: 'KARDEX', sede: null, cpw: false })
          .setSubject('abc')
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuer('siset')
          .setExpirationTime('15m')
          .sign(clave),
    ],
  ])('%s → 401 NO_AUTENTICADO', async (_caso, token) => {
    const r = await pedir(await token());
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('NO_AUTENTICADO');
  });
});
