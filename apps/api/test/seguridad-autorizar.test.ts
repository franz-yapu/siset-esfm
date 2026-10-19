import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { exigirPropio, exigirSede } from '@/compartido/autorizacion';
import { crearAutenticar, crearAutorizar, sesionDe } from '@/modulos/seguridad';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { appDePrueba, SECRETO_JWT_DE_PRUEBA } from './http/utilidades';

const autenticar = crearAutenticar(SECRETO_JWT_DE_PRUEBA);
const autorizar = crearAutorizar();

// Módulo de prueba (montado con modulosExtra): un "file" por persona; el id de la URL
// es el de la persona dueña. Imita lo que hará S2.2 con leer / leer_propio.
const router = Router()
  .get('/prueba/files/:personaId', autenticar, autorizar('files', 'leer', 'leer_propio'), (req, res) => {
    if (res.locals.permiso.accion === 'leer_propio')
      exigirPropio(Number(req.params.personaId) === sesionDe(res).usuarioId);
    res.json({ ok: true, permiso: res.locals.permiso });
  })
  .get('/prueba/sin-autenticar', autorizar('files', 'leer'), (_req, res) => {
    res.json({ ok: true });
  });
const app = appDePrueba({ modulosExtra: [{ router, openapi: {} }] });

const token = async (rol: string, usuarioId = 7, debeCambiarPassword = false) =>
  (await firmarAccessToken({ usuarioId, rol, sedeId: 1, debeCambiarPassword }, SECRETO_JWT_DE_PRUEBA, new Date()))
    .token;
const pedir = async (ruta: string, rol?: string, opciones: { usuarioId?: number; cpw?: boolean } = {}) => {
  const r = request(app).get(`/api/v1${ruta}`);
  if (rol) r.set('Authorization', `Bearer ${await token(rol, opciones.usuarioId, opciones.cpw)}`);
  return r;
};

describe('autorizar (SDD S1.6 §2.3)', () => {
  it('ruta sin autenticar delante: 500 (error de programación, no 401)', async () => {
    expect((await pedir('/prueba/sin-autenticar')).status).toBe(500);
  });

  it('con cpw: 403 CAMBIO_PASSWORD_REQUERIDO aunque el rol tenga el permiso', async () => {
    const r = await pedir('/prueba/files/7', 'KARDEX', { cpw: true });
    expect(r.status).toBe(403);
    expect(r.body.error).toEqual({
      code: 'CAMBIO_PASSWORD_REQUERIDO',
      message: 'Debe cambiar su contraseña antes de continuar.',
    });
  });

  it('rol sin permiso: 403 PROHIBIDO en el formato único', async () => {
    const r = await pedir('/prueba/files/7', 'EGRESADO');
    expect(r.status).toBe(403);
    expect(r.body.error).toEqual({ code: 'PROHIBIDO', message: 'No tiene permiso para realizar esta acción.' });
  });

  it('con varias acciones, entra con la primera permitida', async () => {
    expect((await pedir('/prueba/files/7', 'KARDEX')).body.permiso).toEqual({ recurso: 'files', accion: 'leer' });
    expect((await pedir('/prueba/files/7', 'ESTUDIANTE')).body.permiso).toEqual({
      recurso: 'files',
      accion: 'leer_propio',
    });
  });

  it('URL directa a un recurso ajeno: 403; el propio: 200; quien tiene leer: 200 (RF-02 CA3)', async () => {
    expect((await pedir('/prueba/files/99', 'ESTUDIANTE', { usuarioId: 7 })).status).toBe(403);
    expect((await pedir('/prueba/files/7', 'ESTUDIANTE', { usuarioId: 7 })).status).toBe(200);
    expect((await pedir('/prueba/files/99', 'SEC_COORD')).status).toBe(200);
  });

  it('sin token: 401', async () => {
    expect((await pedir('/prueba/files/7')).status).toBe(401);
  });
});

describe('exigirPropio y exigirSede (SDD S1.6 §2.4)', () => {
  it('exigirPropio lanza 403 solo si no es propio', () => {
    expect(() => exigirPropio(true)).not.toThrow();
    expect(() => exigirPropio(false)).toThrow(expect.objectContaining({ estado: 403 }));
  });

  it('exigirSede exige la misma sede; sin sede (estudiante) no pasa', () => {
    expect(() => exigirSede(2, 2)).not.toThrow();
    expect(() => exigirSede(1, 2)).toThrow(expect.objectContaining({ estado: 403 }));
    expect(() => exigirSede(null, 2)).toThrow(expect.objectContaining({ estado: 403 }));
  });
});

describe('GET /auth/mis-permisos (SDD S1.6 §2.5)', () => {
  it('SEC_DIR recibe sus 5 permisos (sin files, DEC-054)', async () => {
    const r = await pedir('/auth/mis-permisos', 'SEC_DIR');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      rol: 'SEC_DIR',
      permisos: [
        { recurso: 'hojas-ruta', accion: 'crear' },
        { recurso: 'hojas-ruta', accion: 'leer' },
        { recurso: 'pases', accion: 'crear' },
        { recurso: 'pases', accion: 'leer' },
        { recurso: 'reportes', accion: 'leer' },
      ],
    });
  });

  it('responde también con cpw; sin token, 401', async () => {
    expect((await pedir('/auth/mis-permisos', 'KARDEX', { cpw: true })).status).toBe(200);
    expect((await pedir('/auth/mis-permisos')).status).toBe(401);
  });
});
