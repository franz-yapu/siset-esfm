import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { appDePrueba, bdFalsa } from './utilidades';
import type { ClienteBd } from '@/compartido/bd';

// BD falsa: ningún usuario existe, así cada login responde 401 sin PostgreSQL. El intento
// con un CI inexistente se anota en la bitácora (S1.3b): `logAuditoria.create` no hace nada.
const bdSinUsuarios = (): ClienteBd =>
  ({
    ...bdFalsa(),
    usuario: { findUnique: async () => null },
    logAuditoria: { create: async () => ({ id: 1 }) },
  }) as unknown as ClienteBd;

const login = (app: ReturnType<typeof appDePrueba>, ip?: string, cuerpo: object = { usuario: '1', password: 'x' }) => {
  const r = request(app).post('/api/v1/auth/login');
  if (ip) r.set('X-Forwarded-For', ip);
  return r.send(cuerpo);
};

describe('rate limit de POST /auth/login (SDD S1.4 §2.3)', () => {
  it('la 11.ª petición en un minuto desde la misma IP recibe 429 con el formato único', async () => {
    const app = appDePrueba({ bd: bdSinUsuarios() });
    for (let i = 0; i < 10; i++) expect((await login(app)).status).toBe(401);
    const r = await login(app);
    expect(r.status).toBe(429);
    expect(r.body).toEqual({
      error: { code: 'DEMASIADAS_PETICIONES', message: 'Demasiados intentos. Espere un minuto y vuelva a intentar.' },
    });
    expect(r.headers['ratelimit']).toBeDefined();
  });

  it('otra IP (detrás del proxy de confianza) sigue pasando', async () => {
    const app = appDePrueba({ bd: bdSinUsuarios(), config: { trustProxy: 1 } });
    for (let i = 0; i < 10; i++) await login(app, '203.0.113.1');
    expect((await login(app, '203.0.113.1')).status).toBe(429);
    expect((await login(app, '203.0.113.2')).status).toBe(401);
  });

  it('las peticiones mal formadas también cuentan', async () => {
    const app = appDePrueba({ bd: bdSinUsuarios() });
    for (let i = 0; i < 10; i++) expect((await login(app, undefined, {})).status).toBe(400);
    expect((await login(app)).status).toBe(429);
  });
});
