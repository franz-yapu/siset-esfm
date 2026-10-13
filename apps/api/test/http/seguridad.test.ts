import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { obtenerContexto, type ModuloHttp } from '@/compartido/http';
import { appDePrueba } from './utilidades';

const moduloContexto: ModuloHttp = {
  openapi: {},
  router: Router().get('/prueba/contexto', async (_req, res) => {
    await Promise.resolve(); // el contexto sobrevive a un await
    res.json(obtenerContexto());
  }),
};

describe('seguridad HTTP (RNF-10)', () => {
  it('envía las cabeceras de Helmet y no expone x-powered-by', async () => {
    const r = await request(appDePrueba()).get('/api/v1/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-security-policy']).toBeDefined();
    expect(r.headers['x-powered-by']).toBeUndefined();
  });

  it('CORS: permite el origen de la web y no otros', async () => {
    const app = appDePrueba();
    const permitido = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(permitido.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(permitido.headers['access-control-allow-credentials']).toBe('true');
    const ajeno = await request(app).get('/api/v1/health').set('Origin', 'https://malicioso.example');
    expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('contexto de la petición (SDD S0.7 §2.5)', () => {
  const app = appDePrueba({ modulosExtra: [moduloContexto] });

  it('genera X-Request-Id si no llega y lo expone en el contexto', async () => {
    const r = await request(app).get('/api/v1/prueba/contexto').set('User-Agent', 'prueba/1.0');
    expect(r.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.body).toMatchObject({ idPeticion: r.headers['x-request-id'], userAgent: 'prueba/1.0', usuarioId: null });
  });

  it('respeta un X-Request-Id válido y reemplaza uno inválido', async () => {
    expect((await request(app).get('/api/v1/health').set('X-Request-Id', 'abc-123')).headers['x-request-id']).toBe(
      'abc-123',
    );
    expect(
      (await request(app).get('/api/v1/health').set('X-Request-Id', 'no válido <script>')).headers['x-request-id'],
    ).not.toContain('<');
  });

  it('con TRUST_PROXY=1 toma la IP real de X-Forwarded-For (para la bitácora)', async () => {
    const detrasDeNginx = appDePrueba({ config: { trustProxy: 1 }, modulosExtra: [moduloContexto] });
    const r = await request(detrasDeNginx).get('/api/v1/prueba/contexto').set('X-Forwarded-For', '203.0.113.7');
    expect(r.body.ip).toBe('203.0.113.7');
    const sinProxy = await request(app).get('/api/v1/prueba/contexto').set('X-Forwarded-For', '203.0.113.7');
    expect(sinProxy.body.ip).not.toBe('203.0.113.7');
  });
});

describe('OpenAPI', () => {
  it('openapi.json documenta /api/v1/health fuera de producción', async () => {
    const r = await request(appDePrueba()).get('/api/v1/openapi.json');
    expect(r.status).toBe(200);
    expect(r.body.openapi).toBe('3.1.0');
    expect(r.body.paths['/api/v1/health'].get.responses).toHaveProperty('503');
  });

  it('en producción /docs y /openapi.json no existen', async () => {
    const prod = appDePrueba({ config: { entorno: 'production' } });
    expect((await request(prod).get('/api/v1/openapi.json')).status).toBe(404);
    expect((await request(prod).get('/api/v1/docs/')).status).toBe(404);
  });
});
