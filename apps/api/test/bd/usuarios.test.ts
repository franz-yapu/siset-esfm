import { decodeJwt } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { hashPassword } from '@/modulos/seguridad';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, cookieRefresh, crearUsuarioDePrueba, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });
let siguienteCi = 8800100;
const nuevoCi = () => String(siguienteCi++);

let adminId = 0;
let sedeLaPaz = 0;
let sedeAncocagua = 0;

const tokenDe = async (usuarioId: number, rol = 'ADMIN', cpw = false) =>
  (
    await firmarAccessToken(
      { usuarioId, rol, sedeId: null, debeCambiarPassword: cpw },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;

/** Un ADMIN activo, sin contraseña por cambiar (DEC-054). */
async function crearAdmin(): Promise<number> {
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'ADMIN' } });
  const ci = nuevoCi();
  const persona = await bd.persona.create({ data: { ci, nombres: 'Otro', apellidoPaterno: 'Admin' } });
  const u = await bd.usuario.create({
    data: {
      personaId: persona.id,
      rolId: rol.id,
      sedeId: sedeAncocagua,
      username: ci,
      passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
      debeCambiarPassword: false,
    },
  });
  return u.id;
}

const como = async (metodo: 'get' | 'post' | 'patch', ruta: string, cuerpo?: object, usuarioId = adminId) => {
  const r = request(app)
    [metodo](`/api/v1${ruta}`)
    .set('Authorization', `Bearer ${await tokenDe(usuarioId)}`);
  return cuerpo ? r.send(cuerpo) : r;
};

const datosNuevo = (extra: object = {}) => ({
  ci: nuevoCi(),
  nombres: 'Rosa',
  apellidoPaterno: 'Quispe',
  celular: '71234567',
  rol: 'SEC_COORD',
  sedeId: sedeAncocagua,
  ...extra,
});

const crear = async (extra: object = {}) => {
  const r = await como('post', '/usuarios', datosNuevo(extra));
  expect(r.status).toBe(201);
  return r.body as { usuario: { id: number; usuario: string }; passwordTemporal: string };
};

const eventos = (entidadId: number, accion?: string) =>
  bd.logAuditoria.findMany({
    where: { entidad: 'usuario', entidadId: String(entidadId), accion },
    orderBy: { id: 'asc' },
  });

const login = (usuario: string, password: string) =>
  request(app).post('/api/v1/auth/login').send({ usuario, password });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  sedeLaPaz = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'LA_PAZ' } })).id;
  sedeAncocagua = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'ANCOCAGUA' } })).id;
  adminId = await crearAdmin();
});
afterAll(() => bd.$disconnect());

describe('POST /api/v1/usuarios (SDD S1.8 §2.2, RF-03 CA1)', () => {
  it('crea persona y usuario con una temporal que entra y obliga a cambiarla', async () => {
    const ci = nuevoCi();
    const r = await como('post', '/usuarios', datosNuevo({ ci, complemento: '1b', apellidoMaterno: '' }));
    expect(r.status).toBe(201);
    expect(r.body.usuario).toMatchObject({
      usuario: `${ci}-1B`,
      ci,
      complemento: '1B',
      nombre: 'Rosa Quispe',
      apellidoMaterno: null,
      email: null,
      rol: 'SEC_COORD',
      sedeId: sedeAncocagua,
      activo: true,
      estado: 'ACTIVO',
      debeCambiarPassword: true,
      ultimoAcceso: null,
    });
    const u = await bd.usuario.findUniqueOrThrow({ where: { id: r.body.usuario.id }, include: { persona: true } });
    expect(u.persona).toMatchObject({ ci, complemento: '1B', nombres: 'Rosa' });

    const sesion = await login(`${ci}-1b`, r.body.passwordTemporal);
    expect(sesion.status).toBe(200);
    expect(decodeJwt(sesion.body.accessToken).cpw).toBe(true);
  });

  it('registra CREAR a nombre del Administrador, sin contraseña ni hash', async () => {
    const { usuario, passwordTemporal } = await crear();
    const [evento] = await eventos(usuario.id, 'CREAR');
    expect(evento).toMatchObject({ usuarioId: adminId, modulo: 'SEGURIDAD', datosAntes: null });
    expect(evento.datosDespues).toMatchObject({ id: usuario.id, rol: 'SEC_COORD' });
    const texto = JSON.stringify(evento);
    expect(texto).not.toContain(passwordTemporal);
    expect(texto).not.toMatch(/passwordHash|password_hash|\$2[aby]\$/);
  });

  it('CI con cuenta: 409 USUARIO_EXISTENTE', async () => {
    const ci = nuevoCi();
    await crear({ ci });
    const r = await como('post', '/usuarios', datosNuevo({ ci }));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('USUARIO_EXISTENTE');
  });

  it('DEC-063: al Kardex se le suma la cuenta de Administrador, CI-ADM, con la misma persona y su propia contraseña', async () => {
    const ci = nuevoCi();
    const kardex = await crear({ ci, rol: 'KARDEX' });
    const r = await como('post', '/usuarios', datosNuevo({ ci, rol: 'ADMIN', nombres: 'Otro nombre' }));
    expect(r.status).toBe(201);
    expect(r.body.usuario).toMatchObject({ usuario: `${ci}-ADM`, rol: 'ADMIN', ci, nombre: 'Rosa Quispe' });
    const [a, b] = await bd.usuario.findMany({ where: { id: { in: [kardex.usuario.id, r.body.usuario.id] } } });
    expect(a.personaId).toBe(b.personaId);
    expect((await login(`${ci}-adm`, r.body.passwordTemporal)).status).toBe(200);
    expect((await login(ci, r.body.passwordTemporal)).status).toBe(401);
  });

  it('DEC-063: sin segunda cuenta que no sea de Administrador, ni dos de Administrador, ni para un estudiante', async () => {
    const ci = nuevoCi();
    await crear({ ci, rol: 'KARDEX' });
    for (const rol of ['SEC_COORD', 'KARDEX']) {
      expect((await como('post', '/usuarios', datosNuevo({ ci, rol }))).body.error.code).toBe('USUARIO_EXISTENTE');
    }
    await crear({ ci, rol: 'ADMIN' });
    expect((await como('post', '/usuarios', datosNuevo({ ci, rol: 'ADMIN' }))).status).toBe(409);

    const ciAdmin = nuevoCi();
    await crear({ ci: ciAdmin, rol: 'ADMIN' });
    expect((await como('post', '/usuarios', datosNuevo({ ci: ciAdmin, rol: 'ADMIN' }))).status).toBe(409);
  });

  it('DEC-063: con dos cuentas, el rol de ninguna se cambia (422 CUENTA_DOBLE)', async () => {
    const ci = nuevoCi();
    const kardex = await crear({ ci, rol: 'KARDEX' });
    const admin = await crear({ ci, rol: 'ADMIN' });
    for (const id of [kardex.usuario.id, admin.usuario.id]) {
      const r = await como('patch', `/usuarios/${id}`, { rol: 'SEC_COORD' });
      expect([r.status, r.body.error.code]).toEqual([422, 'CUENTA_DOBLE']);
    }
    expect((await como('patch', `/usuarios/${kardex.usuario.id}`, { celular: '76543210' })).status).toBe(200);
  });

  it('CI de una persona sin cuenta: la reutiliza sin cambiar sus datos', async () => {
    const ci = nuevoCi();
    const persona = await bd.persona.create({ data: { ci, nombres: 'Juana', apellidoPaterno: 'Mamani' } });
    const r = await como('post', '/usuarios', datosNuevo({ ci, nombres: 'Otro nombre' }));
    expect(r.status).toBe(201);
    expect(r.body.usuario).toMatchObject({ nombre: 'Juana Mamani', celular: null });
    expect(await bd.persona.count({ where: { ci } })).toBe(1);
    expect((await bd.usuario.findUniqueOrThrow({ where: { id: r.body.usuario.id } })).personaId).toBe(persona.id);
  });

  it('si falla la cuenta, no queda la persona ni el evento (transacción entre módulos)', async () => {
    const ci = nuevoCi();
    const eventosAntes = await bd.logAuditoria.count({ where: { accion: 'CREAR' } });
    const r = await como('post', '/usuarios', datosNuevo({ ci, sedeId: 999_999 }));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('SEDE_INEXISTENTE');
    expect(await bd.persona.count({ where: { ci } })).toBe(0);
    expect(await bd.logAuditoria.count({ where: { accion: 'CREAR' } })).toBe(eventosAntes);
  });

  it.each([
    ['rol ESTUDIANTE', { rol: 'ESTUDIANTE' }],
    ['rol EGRESADO', { rol: 'EGRESADO' }],
    ['sin sede', { sedeId: undefined }],
    ['sin apellidos', { apellidoPaterno: null }],
    ['CI con letras', { ci: '12AB34' }],
    ['complemento largo', { complemento: '123456' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['un campo desconocido', { password: 'elegida-1' }],
  ])('%s: 400 VALIDACION', async (_caso, extra) => {
    const r = await como('post', '/usuarios', datosNuevo(extra));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });
});

describe('GET /api/v1/usuarios', () => {
  let ids: number[] = [];

  beforeAll(async () => {
    const a = await crear({ nombres: 'Ana', apellidoPaterno: 'Zubieta', rol: 'SEC_DIR', sedeId: sedeLaPaz });
    const b = await crear({ nombres: 'Beto', apellidoPaterno: 'Zubieta', apellidoMaterno: 'Arce' });
    const c = await crear({ nombres: 'Carla', apellidoPaterno: 'Arze', apellidoMaterno: 'Zubieta' });
    ids = [a.usuario.id, b.usuario.id, c.usuario.id];
    await bd.usuario.update({ where: { id: ids[1] }, data: { activo: false } });
    await bd.usuario.update({ where: { id: ids[2] }, data: { bloqueadoHasta: new Date(Date.now() + 600_000) } });
  });

  const listar = (query: Record<string, string | number>) =>
    como('get', `/usuarios?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`);

  it('busca por nombre sin distinguir mayúsculas y ordena por apellido', async () => {
    const r = await listar({ texto: 'zubieta' });
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    expect(r.body.datos.map((u: { nombre: string }) => u.nombre)).toEqual([
      'Carla Arze Zubieta',
      'Ana Zubieta',
      'Beto Zubieta Arce',
    ]);
    expect((await listar({ texto: 'beto ZUB' })).body.datos).toHaveLength(1);
  });

  it('busca por CI', async () => {
    const { body } = await como('get', `/usuarios/${ids[0]}`);
    const r = await listar({ texto: body.ci });
    expect(r.body.datos.map((u: { id: number }) => u.id)).toEqual([ids[0]]);
  });

  it.each([
    ['rol', () => ({ rol: 'SEC_DIR' }), [0], 'ACTIVO'],
    ['sede', () => ({ sedeId: sedeLaPaz }), [0], 'ACTIVO'],
    ['estado ACTIVO', () => ({ estado: 'ACTIVO' }), [0], 'ACTIVO'],
    ['estado INACTIVO', () => ({ estado: 'INACTIVO' }), [1], 'INACTIVO'],
    ['estado BLOQUEADO', () => ({ estado: 'BLOQUEADO' }), [2], 'BLOQUEADO'],
  ] as const)('filtra por %s', async (_caso, filtro, esperados, estado) => {
    const r = await listar({ texto: 'zubieta', ...filtro() });
    expect(r.body.datos.map((u: { id: number }) => u.id)).toEqual(esperados.map((i) => ids[i]));
    expect(r.body.datos.map((u: { estado: string }) => u.estado)).toEqual(esperados.map(() => estado));
  });

  it('pagina', async () => {
    const r = await listar({ texto: 'zubieta', pagina: 2, porPagina: 2 });
    expect(r.body).toMatchObject({ pagina: 2, porPagina: 2, total: 3 });
    expect(r.body.datos.map((u: { nombre: string }) => u.nombre)).toEqual(['Beto Zubieta Arce']);
  });

  it('ver uno; inexistente → 404', async () => {
    expect((await como('get', `/usuarios/${ids[0]}`)).body).toMatchObject({ id: ids[0], nombre: 'Ana Zubieta' });
    const r = await como('get', '/usuarios/999999');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NO_ENCONTRADO');
  });
});

describe('PATCH /api/v1/usuarios/:id', () => {
  it('cambia solo lo enviado y registra EDITAR con antes y después de esos campos', async () => {
    const { usuario } = await crear();
    const r = await como('patch', `/usuarios/${usuario.id}`, { rol: 'SEC_DIR', celular: '79999999', nombres: 'Rosa' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ rol: 'SEC_DIR', celular: '79999999', nombres: 'Rosa', apellidoPaterno: 'Quispe' });
    const [evento] = await eventos(usuario.id, 'EDITAR');
    expect(evento).toMatchObject({
      usuarioId: adminId,
      datosAntes: { rol: 'SEC_COORD', celular: '71234567' },
      datosDespues: { rol: 'SEC_DIR', celular: '79999999' },
    });
  });

  it('sin cambios reales: 200 sin evento', async () => {
    const { usuario } = await crear();
    expect((await como('patch', `/usuarios/${usuario.id}`, { nombres: 'Rosa' })).status).toBe(200);
    expect(await eventos(usuario.id, 'EDITAR')).toHaveLength(0);
  });

  it.each([
    ['cuerpo vacío', {}],
    ['con el CI', { ci: '1234567' }],
    ['con el complemento', { complemento: '1A' }],
    ['rol EGRESADO', { rol: 'EGRESADO' }],
    ['sede null', { sedeId: null }],
  ])('%s: 400', async (_caso, cuerpo) => {
    const { usuario } = await crear();
    const r = await como('patch', `/usuarios/${usuario.id}`, cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });

  it('quitar el único apellido: 400 y nada cambia', async () => {
    const { usuario } = await crear();
    const r = await como('patch', `/usuarios/${usuario.id}`, { apellidoPaterno: null });
    expect(r.status).toBe(400);
    expect((await como('get', `/usuarios/${usuario.id}`)).body.apellidoPaterno).toBe('Quispe');
  });

  it('sede inexistente: 422 SEDE_INEXISTENTE', async () => {
    const { usuario } = await crear();
    const r = await como('patch', `/usuarios/${usuario.id}`, { sedeId: 999_999 });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('SEDE_INEXISTENTE');
  });
});

describe('baja y reactivación (RF-03 CA2)', () => {
  it('la baja cierra sus sesiones y registra DAR_DE_BAJA; reactivar registra REACTIVAR', async () => {
    const ci = nuevoCi();
    const { id } = await crearUsuarioDePrueba(bd, ci);
    const cookie = cookieRefresh((await login(ci, PASSWORD_DE_PRUEBA)).headers)!;

    const baja = await como('post', `/usuarios/${id}/baja`);
    expect(baja.status).toBe(200);
    expect(baja.body).toMatchObject({ activo: false, estado: 'INACTIVO' });
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', `siset_refresh=${cookie}`)).status).toBe(401);
    expect((await login(ci, PASSWORD_DE_PRUEBA)).status).toBe(401);
    expect((await como('post', `/usuarios/${id}/baja`)).body.error.code).toBe('ESTADO_SIN_CAMBIO');

    const alta = await como('post', `/usuarios/${id}/reactivar`);
    expect(alta.body).toMatchObject({ activo: true, estado: 'ACTIVO' });
    expect((await login(ci, PASSWORD_DE_PRUEBA)).status).toBe(200);
    const r = await como('post', `/usuarios/${id}/reactivar`);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('ESTADO_SIN_CAMBIO');

    expect((await eventos(id)).filter((e) => e.usuarioId === adminId).map((e) => [e.accion, e.datosDespues])).toEqual([
      ['DAR_DE_BAJA', { activo: false }],
      ['REACTIVAR', { activo: true }],
    ]);
  });
});

describe('reglas sobre el Administrador (DEC-020 #4, DEC-054)', () => {
  it('el Administrador no puede darse de baja ni quitarse el rol', async () => {
    const baja = await como('post', `/usuarios/${adminId}/baja`);
    expect(baja.status).toBe(422);
    expect(baja.body.error.code).toBe('OPERACION_SOBRE_SI_MISMO');
    const rol = await como('patch', `/usuarios/${adminId}`, { rol: 'SEC_DIR' });
    expect(rol.status).toBe(422);
    expect(rol.body.error.code).toBe('OPERACION_SOBRE_SI_MISMO');
    // Su sede y sus datos sí.
    expect((await como('patch', `/usuarios/${adminId}`, { celular: '70000000' })).status).toBe(200);
  });

  it('no se puede dar de baja ni cambiar el rol del último ADMIN activo', async () => {
    // El autor es un Administrador ya dado de baja (su token sigue vigente unos minutos): el objetivo queda solo.
    const autor = await crearAdmin();
    const objetivo = await crearAdmin();
    const otros = await bd.usuario.findMany({
      where: { activo: true, rol: { codigo: 'ADMIN' }, id: { not: objetivo } },
      select: { id: true },
    });
    await bd.usuario.updateMany({ where: { id: { in: otros.map((o) => o.id) } }, data: { activo: false } });
    try {
      const baja = await como('post', `/usuarios/${objetivo}/baja`, undefined, autor);
      expect(baja.status).toBe(422);
      expect(baja.body.error.code).toBe('ULTIMO_ADMIN');
      const rol = await como('patch', `/usuarios/${objetivo}`, { rol: 'SEC_DIR' }, autor);
      expect(rol.body.error.code).toBe('ULTIMO_ADMIN');
      expect((await bd.usuario.findUniqueOrThrow({ where: { id: objetivo } })).activo).toBe(true);
    } finally {
      await bd.usuario.updateMany({ where: { id: { in: otros.map((o) => o.id) } }, data: { activo: true } });
    }
  });
});

describe('restablecer y desbloquear (RF-03 CA4, S1.4)', () => {
  it('restablecer: temporal nueva que entra, la vieja no; cpw; sin bloqueo; sesiones cerradas; RESTABLECER_PASSWORD', async () => {
    const ci = nuevoCi();
    const { id } = await crearUsuarioDePrueba(bd, ci);
    const cookie = cookieRefresh((await login(ci, PASSWORD_DE_PRUEBA)).headers)!;
    await bd.usuario.update({
      where: { id },
      data: { bloqueadoHasta: new Date(Date.now() + 600_000), intentosFallidos: 2 },
    });

    const r = await como('post', `/usuarios/${id}/restablecer-password`);
    expect(r.status).toBe(200);
    expect(r.body.usuario).toMatchObject({ estado: 'ACTIVO', debeCambiarPassword: true, bloqueadoHasta: null });
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', `siset_refresh=${cookie}`)).status).toBe(401);
    expect((await login(ci, PASSWORD_DE_PRUEBA)).status).toBe(401);
    const nueva = await login(ci, r.body.passwordTemporal);
    expect(nueva.status).toBe(200);
    expect(decodeJwt(nueva.body.accessToken).cpw).toBe(true);

    const [evento] = await eventos(id, 'RESTABLECER_PASSWORD');
    expect(evento).toMatchObject({ usuarioId: adminId, entidadId: String(id), datosDespues: null });
    expect(JSON.stringify(evento)).not.toContain(r.body.passwordTemporal);
  });

  it('desbloquear: limpia el bloqueo y registra DESBLOQUEAR_CUENTA; sin bloqueo → 422', async () => {
    const ci = nuevoCi();
    const hasta = new Date(Date.now() + 600_000);
    const { id } = await crearUsuarioDePrueba(bd, ci, { bloqueadoHasta: hasta });
    await bd.usuario.update({ where: { id }, data: { intentosFallidos: 3 } });

    const r = await como('post', `/usuarios/${id}/desbloquear`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ estado: 'ACTIVO', bloqueadoHasta: null });
    expect((await bd.usuario.findUniqueOrThrow({ where: { id } })).intentosFallidos).toBe(0);
    expect((await login(ci, PASSWORD_DE_PRUEBA)).status).toBe(200);
    const [evento] = await eventos(id, 'DESBLOQUEAR_CUENTA');
    expect(evento).toMatchObject({
      usuarioId: adminId,
      datosAntes: { bloqueadoHasta: hasta.toISOString(), intentosFallidos: 3 },
      datosDespues: { bloqueadoHasta: null, intentosFallidos: 0 },
    });

    const otra = await como('post', `/usuarios/${id}/desbloquear`);
    expect(otra.status).toBe(422);
    expect(otra.body.error.code).toBe('ESTADO_SIN_CAMBIO');
  });

  it('restablecer o desbloquear a un usuario inexistente: 404', async () => {
    expect((await como('post', '/usuarios/999999/restablecer-password')).status).toBe(404);
    expect((await como('post', '/usuarios/999999/desbloquear')).status).toBe(404);
  });
});

describe('seguridad de /usuarios', () => {
  it('ninguna respuesta trae el hash', async () => {
    const { usuario } = await crear();
    const respuestas = await Promise.all([
      como('get', '/usuarios'),
      como('get', `/usuarios/${usuario.id}`),
      como('patch', `/usuarios/${usuario.id}`, { celular: '1' }),
      como('post', `/usuarios/${usuario.id}/restablecer-password`),
    ]);
    for (const r of respuestas) expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|password_hash|\$2[aby]\$/);
  });

  const rutas: ['get' | 'post' | 'patch', string, object?][] = [
    ['get', '/usuarios'],
    ['get', '/usuarios/1'],
    ['post', '/usuarios', {}],
    ['patch', '/usuarios/1', { celular: '1' }],
    ['post', '/usuarios/1/baja'],
    ['post', '/usuarios/1/reactivar'],
    ['post', '/usuarios/1/restablecer-password'],
    ['post', '/usuarios/1/desbloquear'],
  ];

  it.each(rutas)('%s %s: SEC_DIR y KARDEX 403, sin token 401, ADMIN con cpw 403', async (metodo, ruta, cuerpo) => {
    const conToken = async (token: string | null) => {
      const r = request(app)[metodo](`/api/v1${ruta}`);
      if (token) r.set('Authorization', `Bearer ${token}`);
      return cuerpo ? r.send(cuerpo) : r;
    };
    expect((await conToken(await tokenDe(adminId, 'SEC_DIR'))).status).toBe(403);
    expect((await conToken(await tokenDe(adminId, 'KARDEX'))).status).toBe(403);
    expect((await conToken(null)).status).toBe(401);
    const cpw = await conToken(await tokenDe(adminId, 'ADMIN', true));
    expect(cpw.status).toBe(403);
    expect(cpw.body.error.code).toBe('CAMBIO_PASSWORD_REQUERIDO');
  });

  it('OpenAPI documenta las 8 rutas', async () => {
    const { body } = await request(app).get('/api/v1/openapi.json');
    const operaciones = Object.entries(body.paths as Record<string, object>)
      .filter(([ruta]) => ruta.startsWith('/api/v1/usuarios'))
      .flatMap(([ruta, ops]) => Object.keys(ops).map((m) => `${m} ${ruta}`));
    expect(operaciones.sort()).toEqual(
      [
        'get /api/v1/usuarios',
        'post /api/v1/usuarios',
        'get /api/v1/usuarios/{id}',
        'patch /api/v1/usuarios/{id}',
        'post /api/v1/usuarios/{id}/baja',
        'post /api/v1/usuarios/{id}/reactivar',
        'post /api/v1/usuarios/{id}/restablecer-password',
        'post /api/v1/usuarios/{id}/desbloquear',
      ].sort(),
    );
  });
});
