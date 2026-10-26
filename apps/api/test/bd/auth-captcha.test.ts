import request from 'supertest';
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { configDePrueba } from '../http/utilidades';
import { clienteDeTest, crearUsuarioDePrueba, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

// ADR-0012: captcha ALTCHA en el login tras 3 fallos desde la misma IP. Cada test usa su propia app (su propio
// conteo en memoria) y su IP de prueba (trust proxy + X-Forwarded-For).

const bd = clienteDeTest();
const nuevaApp = () =>
  crearApp({
    bd,
    config: configDePrueba({ loginLimitePorMinuto: 1000, captchaTrasFallos: 3, trustProxy: 1, jsonLimite: '20kb' }),
  });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  for (let i = 1; i <= 5; i++) await crearUsuarioDePrueba(bd, `667000${i}`);
});
afterAll(() => bd.$disconnect());

type App = ReturnType<typeof nuevaApp>;
/** Cada test con su usuario: el bloqueo por 5 contraseñas mal (S1.4) no se mezcla entre tests. La IP es 10.0.N.1. */
const login = (app: App, ip: string, password: string, captcha?: string) =>
  request(app)
    .post('/api/v1/auth/login')
    .set('X-Forwarded-For', ip)
    .send({
      usuario: `667000${Number(ip.split('.')[2]) + 1}`,
      password,
      ...(captcha === undefined ? {} : { captcha }),
    });

/** Pide un reto y lo resuelve como el widget: base64 de { challenge, solution }. */
async function resolver(app: App, ip: string, alterar?: (c: Challenge) => Challenge): Promise<string> {
  const r = await request(app).get('/api/v1/auth/captcha').set('X-Forwarded-For', ip);
  expect(r.status).toBe(200);
  expect(r.headers['cache-control']).toBe('no-store');
  const challenge: Challenge = { parameters: r.body.parameters, signature: r.body.signature };
  const solution = await solveChallenge({ challenge, deriveKey });
  expect(solution).not.toBeNull();
  const enviado = alterar ? alterar(challenge) : challenge;
  return Buffer.from(JSON.stringify({ challenge: enviado, solution })).toString('base64');
}

const fallar = async (app: App, ip: string, veces: number) => {
  for (let i = 0; i < veces; i++) expect((await login(app, ip, 'mala-1234')).status).toBe(401);
};

const ultimoEvento = () => bd.logAuditoria.findFirstOrThrow({ orderBy: { id: 'desc' } });

describe('captcha del login (ADR-0012)', () => {
  it('hasta 2 fallos no lo pide; desde el 3.º, 400 CAPTCHA_REQUERIDO sin mirar la contraseña, y queda en la bitácora', async () => {
    const app = nuevaApp();
    await fallar(app, '10.0.0.1', 2);
    expect((await login(app, '10.0.0.1', PASSWORD_DE_PRUEBA)).status).toBe(200);
    await fallar(app, '10.0.0.1', 3);
    const r = await login(app, '10.0.0.1', PASSWORD_DE_PRUEBA);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('CAPTCHA_REQUERIDO');
    expect(await ultimoEvento()).toMatchObject({
      accion: 'LOGIN_FALLIDO',
      usuarioId: null,
      entidadId: '6670001',
      datosDespues: { motivo: 'CAPTCHA_REQUERIDO' },
    });
    // Otra IP no se ve afectada.
    expect((await login(app, '10.0.0.2', PASSWORD_DE_PRUEBA)).status).toBe(200);
  });

  it('con el reto resuelto entra, y el login correcto borra el conteo de la IP', async () => {
    const app = nuevaApp();
    await fallar(app, '10.0.1.1', 3);
    const r = await login(app, '10.0.1.1', PASSWORD_DE_PRUEBA, await resolver(app, '10.0.1.1'));
    expect(r.status).toBe(200);
    expect((await login(app, '10.0.1.1', PASSWORD_DE_PRUEBA)).status).toBe(200);
  });

  it('con el captcha bien y la contraseña mal, es un 401 más (sigue contando)', async () => {
    const app = nuevaApp();
    await fallar(app, '10.0.2.1', 3);
    const r = await login(app, '10.0.2.1', 'mala-1234', await resolver(app, '10.0.2.1'));
    expect(r.status).toBe(401);
    expect((await login(app, '10.0.2.1', PASSWORD_DE_PRUEBA)).body.error.code).toBe('CAPTCHA_REQUERIDO');
  });

  it('CAPTCHA_INVALIDO: reto reusado, alterado, vencido o basura', async () => {
    const app = nuevaApp();
    const ip = '10.0.3.1';
    await fallar(app, ip, 3);
    const bueno = await resolver(app, ip);
    // Un login correcto borra el conteo: para probar el reuso, se vuelve a fallar 3 veces.
    expect((await login(app, ip, PASSWORD_DE_PRUEBA, bueno)).status).toBe(200);
    await fallar(app, ip, 3);
    const reusado = await login(app, ip, PASSWORD_DE_PRUEBA, bueno);
    expect(reusado.status).toBe(400);
    expect(reusado.body.error.code).toBe('CAPTCHA_INVALIDO');
    expect((await ultimoEvento()).datosDespues).toEqual({ motivo: 'CAPTCHA_INVALIDO' });

    const alterado = await resolver(app, ip, (c) => ({ ...c, parameters: { ...c.parameters, cost: 1 } }));
    expect((await login(app, ip, PASSWORD_DE_PRUEBA, alterado)).body.error.code).toBe('CAPTCHA_INVALIDO');
    const vencido = await resolver(app, ip, (c) => ({ ...c, parameters: { ...c.parameters, expiresAt: 1 } }));
    expect((await login(app, ip, PASSWORD_DE_PRUEBA, vencido)).body.error.code).toBe('CAPTCHA_INVALIDO');
    expect((await login(app, ip, PASSWORD_DE_PRUEBA, 'no-es-base64')).body.error.code).toBe('CAPTCHA_INVALIDO');
  });

  it('con CAPTCHA_TRAS_FALLOS=0 nunca lo pide', async () => {
    const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000, trustProxy: 1 }) });
    await fallar(app, '10.0.4.1', 6);
    // La cuenta quedó bloqueada por intentos (S1.4), pero no hay captcha: es 401, no 400.
    expect((await login(app, '10.0.4.1', PASSWORD_DE_PRUEBA)).status).toBe(401);
  });
});
