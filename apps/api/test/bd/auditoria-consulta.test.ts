import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, crearUsuarioDePrueba, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
let usuarioId = 0;

const token = async (rol: string, cpw = false) =>
  (
    await firmarAccessToken(
      { usuarioId: 1, rol, sedeId: null, debeCambiarPassword: cpw },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;
const consultar = async (query: Record<string, string | number> = {}, rol = 'ADMIN', cpw = false) =>
  request(app)
    .get('/api/v1/auditoria')
    .query({ entidad: 'prueba-consulta', ...query })
    .set('Authorization', `Bearer ${await token(rol, cpw)}`);

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  usuarioId = (await crearUsuarioDePrueba(bd, '7710001')).id;
  // 5 eventos propios, con entidad 'prueba-consulta' para aislarlos del resto de la base.
  // Fechas en hora de La Paz (UTC−4): 10-oct 23:30 La Paz = 11-oct 03:30 UTC.
  const base = { entidad: 'prueba-consulta' };
  await bd.logAuditoria.createMany({
    data: [
      {
        ...base,
        entidadId: '1',
        usuarioId,
        accion: 'LOGIN',
        modulo: 'SEGURIDAD',
        fecha: new Date('2026-10-11T03:30:00Z'),
      },
      {
        ...base,
        entidadId: '1',
        usuarioId,
        accion: 'LOGOUT',
        modulo: 'SEGURIDAD',
        fecha: new Date('2026-10-11T04:30:00Z'),
      },
      {
        ...base,
        entidadId: '2',
        usuarioId,
        accion: 'EDITAR',
        modulo: 'FILES',
        fecha: new Date('2026-10-12T15:00:00Z'),
      },
      {
        ...base,
        entidadId: '2',
        usuarioId: null,
        accion: 'LOGIN_FALLIDO',
        modulo: 'SEGURIDAD',
        fecha: new Date('2026-10-13T15:00:00Z'),
      },
      {
        ...base,
        entidadId: '3',
        usuarioId,
        accion: 'CREAR',
        modulo: 'FILES',
        fecha: new Date('2026-10-13T15:00:00Z'),
        datosDespues: { a: 1 },
      },
    ],
  });
});
afterAll(() => bd.$disconnect());

describe('GET /api/v1/auditoria (SDD S6.4 §2.2)', () => {
  it('ADMIN: página con datos, total y orden fecha DESC, id DESC, con el nombre del usuario', async () => {
    const r = await consultar();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ pagina: 1, porPagina: 50, total: 5 });
    expect(r.body.datos.map((d: { accion: string }) => d.accion)).toEqual([
      'CREAR',
      'LOGIN_FALLIDO',
      'EDITAR',
      'LOGOUT',
      'LOGIN',
    ]);
    expect(r.body.datos[0]).toMatchObject({
      usuario: { id: usuarioId, usuario: '7710001', nombre: 'Prueba Sesión' },
      modulo: 'FILES',
      entidad: 'prueba-consulta',
      entidadId: '3',
      antes: null,
      despues: { a: 1 },
    });
  });

  it('un evento sin usuario trae usuario null', async () => {
    const r = await consultar({ accion: 'LOGIN_FALLIDO' });
    expect(r.body.datos[0].usuario).toBeNull();
  });

  it.each([
    [{ modulo: 'FILES' }, 2],
    [{ accion: 'LOGIN' }, 1],
    [{ entidadId: '2' }, 2],
    [{ modulo: 'SEGURIDAD', entidadId: '1' }, 2],
  ])('filtro %o → %i eventos', async (filtro, total) => {
    const r = await consultar(filtro);
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(total);
  });

  it('filtro por usuario: sus 4 eventos (el LOGIN_FALLIDO no tiene usuario)', async () => {
    expect((await consultar({ usuarioId })).body.total).toBe(4);
  });

  it('fechas inclusivas en hora de La Paz', async () => {
    // El 10-oct (La Paz) solo tiene el LOGIN de las 23:30; el LOGOUT ya es 11-oct 00:30.
    expect((await consultar({ desde: '2026-10-10', hasta: '2026-10-10' })).body.total).toBe(1);
    expect((await consultar({ desde: '2026-10-11', hasta: '2026-10-12' })).body.total).toBe(2);
    expect((await consultar({ desde: '2026-10-13' })).body.total).toBe(2);
    expect((await consultar({ hasta: '2026-10-11' })).body.total).toBe(2);
  });

  it('paginación: porPagina=2 → 3 páginas; la 4.ª viene vacía con el total', async () => {
    const paginas = await Promise.all([1, 2, 3, 4].map((pagina) => consultar({ porPagina: 2, pagina })));
    expect(paginas.map((p) => p.body.datos.length)).toEqual([2, 2, 1, 0]);
    expect(paginas.every((p) => p.body.total === 5)).toBe(true);
  });

  it.each([
    [{ porPagina: 101 }],
    [{ modulo: 'NO_EXISTE' }],
    [{ desde: '2026-10-13', hasta: '2026-10-12' }],
    [{ pagina: 0 }],
  ])('400 VALIDACION con %o', async (query) => {
    const r = await consultar(query as Record<string, string | number>);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });

  it('entidadId sin entidad → 400', async () => {
    const r = await request(app)
      .get('/api/v1/auditoria')
      .query({ entidadId: '1' })
      .set('Authorization', `Bearer ${await token('ADMIN')}`);
    expect(r.status).toBe(400);
  });

  it('SEC_DIR y KARDEX → 403; sin token → 401; ADMIN con cpw → 403 CAMBIO_PASSWORD_REQUERIDO', async () => {
    expect((await consultar({}, 'SEC_DIR')).status).toBe(403);
    expect((await consultar({}, 'KARDEX')).status).toBe(403);
    expect((await request(app).get('/api/v1/auditoria')).status).toBe(401);
    const r = await consultar({}, 'ADMIN', true);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('CAMBIO_PASSWORD_REQUERIDO');
  });

  it('OpenAPI documenta GET /api/v1/auditoria', async () => {
    const { body } = await request(app).get('/api/v1/openapi.json');
    expect(Object.keys(body.paths['/api/v1/auditoria'].get.responses)).toEqual(['200', '400', '401', '403']);
  });
});
