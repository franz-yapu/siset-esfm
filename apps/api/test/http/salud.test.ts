import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { appDePrueba, bdFalsa } from './utilidades';

describe('GET /api/v1/health', () => {
  it('responde 200 cuando la base de datos responde', async () => {
    const r = await request(appDePrueba()).get('/api/v1/health');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ estado: 'ok', bd: 'ok', version: '9.9.9' });
  });

  it('responde 503 con el formato único cuando la base de datos no responde', async () => {
    const r = await request(appDePrueba({ bd: bdFalsa(() => Promise.reject(new Error('sin conexión'))) })).get(
      '/api/v1/health',
    );
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('BD_NO_DISPONIBLE');
    expect(JSON.stringify(r.body)).not.toContain('sin conexión');
  });
});
