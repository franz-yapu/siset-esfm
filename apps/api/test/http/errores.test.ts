import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Prisma } from '@/compartido/bd';
import { ErrorConflicto, ErrorNegocio } from '@/compartido/errores';
import { validar, type ModuloHttp } from '@/compartido/http';
import { appDePrueba } from './utilidades';

const esquemaBody = z.object({ ci: z.string().min(5), edad: z.number().int() });

const moduloDePrueba: ModuloHttp = {
  openapi: {},
  router: Router()
    .post('/prueba/validar', validar({ body: esquemaBody }), (_req, res) => {
      res.json(res.locals.valido);
    })
    .get('/prueba/negocio', () => {
      throw new ErrorNegocio('El file está bloqueado.', 'FILE_BLOQUEADO');
    })
    .get('/prueba/conflicto', () => {
      throw new ErrorConflicto();
    })
    .get('/prueba/prisma-unico', () => {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['ci'] },
      });
    })
    .get('/prueba/inesperado', async () => {
      throw new Error('detalle interno secreto');
    }),
};

const app = appDePrueba({ modulosExtra: [moduloDePrueba] });

describe('formato único de errores (SDD S0.7 §2.3)', () => {
  it('body inválido → 400 VALIDACION con la ruta de cada problema', async () => {
    const r = await request(app).post('/api/v1/prueba/validar').send({ ci: '12', edad: 'x' });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
    expect(r.body.error.details.map((d: { ruta: string }) => d.ruta).sort()).toEqual(['body.ci', 'body.edad']);
  });

  it('body válido → los datos parseados llegan al controlador', async () => {
    const r = await request(app).post('/api/v1/prueba/validar').send({ ci: '1234567', edad: 30, extra: 1 });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ body: { ci: '1234567', edad: 30 } });
  });

  it('ErrorNegocio → 422 con su código', async () => {
    const r = await request(app).get('/api/v1/prueba/negocio');
    expect(r.status).toBe(422);
    expect(r.body).toEqual({ error: { code: 'FILE_BLOQUEADO', message: 'El file está bloqueado.' } });
  });

  it('ErrorConflicto → 409', async () => {
    expect((await request(app).get('/api/v1/prueba/conflicto')).status).toBe(409);
  });

  it('Prisma P2002 (único) → 409 CONFLICTO con los campos', async () => {
    const r = await request(app).get('/api/v1/prueba/prisma-unico');
    expect(r.status).toBe(409);
    expect(r.body.error.details).toEqual({ campos: ['ci'] });
  });

  it('error inesperado → 500 genérico, sin mensaje interno ni stack', async () => {
    const r = await request(app).get('/api/v1/prueba/inesperado');
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado.' } });
    expect(r.text).not.toContain('secreto');
    expect(r.text).not.toContain('at ');
  });

  it('ruta inexistente → 404 NO_ENCONTRADO', async () => {
    const r = await request(app).get('/api/v1/no-existe');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NO_ENCONTRADO');
  });

  it('JSON malformado → 400 JSON_INVALIDO; body de más de JSON_LIMITE → 413', async () => {
    const malformado = await request(app)
      .post('/api/v1/prueba/validar')
      .set('content-type', 'application/json')
      .send('{malo');
    expect(malformado.status).toBe(400);
    expect(malformado.body.error.code).toBe('JSON_INVALIDO');

    const grande = await request(app)
      .post('/api/v1/prueba/validar')
      .send({ ci: 'x'.repeat(2048), edad: 1 });
    expect(grande.status).toBe(413);
    expect(grande.body.error.code).toBe('PAYLOAD_DEMASIADO_GRANDE');
  });
});
