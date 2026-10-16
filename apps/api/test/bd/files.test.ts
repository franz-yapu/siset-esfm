import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { hashPassword } from '@/modulos/seguridad';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
let siguienteCi = 6600100;
let siguienteCodigo = 1;
const nuevoCi = () => String(siguienteCi++);
const nuevoCodigo = () => `E2-${String(siguienteCodigo++).padStart(4, '0')}`;

let kardexId = 0;
let secDirId = 0;
let matematica = 0;
let primaria = 0;

async function crearUsuario(rol: string): Promise<number> {
  const r = await bd.rol.findUniqueOrThrow({ where: { codigo: rol } });
  const sede = await bd.sede.findUniqueOrThrow({ where: { codigo: 'ANCOCAGUA' } });
  const ci = nuevoCi();
  const persona = await bd.persona.create({ data: { ci, nombres: 'Personal', apellidoPaterno: rol } });
  const u = await bd.usuario.create({
    data: {
      personaId: persona.id,
      rolId: r.id,
      sedeId: sede.id,
      username: ci,
      passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
      debeCambiarPassword: false,
    },
  });
  return u.id;
}

const tokenDe = async (usuarioId: number, rol: string) =>
  (
    await firmarAccessToken(
      { usuarioId, rol, sedeId: null, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;

const como = async (
  metodo: 'get' | 'post' | 'patch',
  ruta: string,
  cuerpo?: object,
  quien: 'KARDEX' | 'SEC_DIR' = 'KARDEX',
) => {
  const id = quien === 'KARDEX' ? kardexId : secDirId;
  const r = request(app)
    [metodo](`/api/v1${ruta}`)
    .set('Authorization', `Bearer ${await tokenDe(id, quien)}`);
  return cuerpo ? r.send(cuerpo) : r;
};

const datosNuevo = (extra: object = {}) => ({
  ci: nuevoCi(),
  nombres: 'Juana',
  apellidoPaterno: 'Mamani',
  apellidoMaterno: 'Quispe',
  fechaNacimiento: '2004-05-10',
  codigo: nuevoCodigo(),
  especialidadId: matematica,
  anioIngreso: 2024,
  modalidad: 'A',
  ...extra,
});

const crear = async (extra: object = {}) => {
  const r = await como('post', '/files', datosNuevo(extra));
  expect(r.status).toBe(201);
  return r.body as { id: number; ci: string; codigo: string };
};

const eventos = (id: number, accion?: string) =>
  bd.logAuditoria.findMany({
    where: { entidad: 'file_academico', entidadId: String(id), accion },
    orderBy: { id: 'asc' },
  });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  kardexId = await crearUsuario('KARDEX');
  secDirId = await crearUsuario('SEC_DIR');
  matematica = (await bd.especialidad.findUniqueOrThrow({ where: { nombre: 'Matemática' } })).id;
  primaria = (
    await bd.especialidad.findUniqueOrThrow({ where: { nombre: 'Educación Primaria Comunitaria Vocacional' } })
  ).id;
});
afterAll(() => bd.$disconnect());

describe('POST /api/v1/files (SDD S2.2 §2.2, RF-04)', () => {
  it('crea persona y file, desbloqueado, y registra CREAR a nombre de Kardex', async () => {
    const ci = nuevoCi();
    const r = await como('post', '/files', datosNuevo({ ci, complemento: '1a', email: '', celular: '71234567' }));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      ci,
      complemento: '1A',
      nombre: 'Juana Mamani Quispe',
      fechaNacimiento: '2004-05-10',
      email: null,
      celular: '71234567',
      especialidadId: matematica,
      especialidad: 'Matemática',
      anioIngreso: 2024,
      condicion: 'ESTUDIANTE',
      bloqueado: false,
      motivoBloqueo: null,
    });
    const file = await bd.fileAcademico.findUniqueOrThrow({ where: { id: r.body.id }, include: { persona: true } });
    expect(file.persona).toMatchObject({ ci, complemento: '1A' });
    const [evento] = await eventos(r.body.id, 'CREAR');
    expect(evento).toMatchObject({ usuarioId: kardexId, modulo: 'FILES', datosAntes: null });
    expect(evento.datosDespues).toMatchObject({ id: r.body.id, codigo: r.body.codigo });
  });

  it('la persona del CI ya tiene file: 409 FILE_EXISTENTE', async () => {
    const { ci } = await crear();
    const r = await como('post', '/files', datosNuevo({ ci }));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('FILE_EXISTENTE');
  });

  it('CI de una persona sin file (del personal): la reutiliza sin tocar sus datos', async () => {
    const ci = nuevoCi();
    const persona = await bd.persona.create({ data: { ci, nombres: 'Rosa', apellidoPaterno: 'Condori' } });
    const r = await como('post', '/files', datosNuevo({ ci, nombres: 'Otro nombre' }));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ nombre: 'Rosa Condori', fechaNacimiento: null });
    expect((await bd.fileAcademico.findUniqueOrThrow({ where: { id: r.body.id } })).personaId).toBe(persona.id);
  });

  it('código repetido: 409 CODIGO_EXISTENTE y no queda la persona nueva (transacción)', async () => {
    const { codigo } = await crear();
    const ci = nuevoCi();
    const r = await como('post', '/files', datosNuevo({ ci, codigo }));
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CODIGO_EXISTENTE');
    expect(await bd.persona.count({ where: { ci } })).toBe(0);
  });

  it('especialidad inexistente: 422 ESPECIALIDAD_INEXISTENTE y sin persona ni evento', async () => {
    const ci = nuevoCi();
    const antes = await bd.logAuditoria.count({ where: { modulo: 'FILES' } });
    const r = await como('post', '/files', datosNuevo({ ci, especialidadId: 999_999 }));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('ESPECIALIDAD_INEXISTENTE');
    expect(await bd.persona.count({ where: { ci } })).toBe(0);
    expect(await bd.logAuditoria.count({ where: { modulo: 'FILES' } })).toBe(antes);
  });

  it.each([
    ['año antes de 1990', { anioIngreso: 1989 }],
    ['año muy adelante', { anioIngreso: new Date().getFullYear() + 2 }],
    ['sin apellidos', { apellidoPaterno: null, apellidoMaterno: null }],
    ['CI con letras', { ci: '12AB34' }],
    ['sin código', { codigo: ' ' }],
    ['fecha mal escrita', { fechaNacimiento: '10/05/2004' }],
    ['condición desconocida', { condicion: 'OTRA' }],
    ['con bloqueado', { bloqueado: true }],
  ])('%s: 400 VALIDACION', async (_caso, extra) => {
    const r = await como('post', '/files', datosNuevo(extra));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });
});

describe('GET /api/v1/files', () => {
  let ids: number[] = [];
  let codigos: string[] = [];
  let ciBuscado = '';

  beforeAll(async () => {
    const a = await crear({ nombres: 'Ana', apellidoPaterno: 'Zapana', apellidoMaterno: null, anioIngreso: 2023 });
    const b = await crear({
      nombres: 'Beto',
      apellidoPaterno: 'Zapana',
      apellidoMaterno: 'Apaza',
      especialidadId: primaria,
    });
    const c = await crear({
      nombres: 'Carla',
      apellidoPaterno: 'Arce',
      apellidoMaterno: 'Zapana',
      condicion: 'EGRESADO',
      anioIngreso: 2020,
    });
    ids = [a.id, b.id, c.id];
    codigos = [a.codigo, b.codigo, c.codigo];
    ciBuscado = a.ci;
    await bd.fileAcademico.update({
      where: { id: c.id },
      data: { bloqueado: true, motivoBloqueo: 'Permiso obligatorio' },
    });
  });

  const listar = (query: Record<string, string | number>) =>
    como('get', `/files?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`);

  it('busca por nombre sin distinguir mayúsculas y ordena por apellido', async () => {
    const r = await listar({ texto: 'zapana' });
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
    expect(r.body.datos.map((f: { nombre: string }) => f.nombre)).toEqual([
      'Carla Arce Zapana',
      'Ana Zapana', // sin apellido materno va antes que "Zapana Apaza"
      'Beto Zapana Apaza',
    ]);
  });

  it('busca por CI y por código', async () => {
    expect((await listar({ texto: ciBuscado })).body.datos.map((f: { id: number }) => f.id)).toEqual([ids[0]]);
    expect((await listar({ texto: codigos[1].toLowerCase() })).body.datos.map((f: { id: number }) => f.id)).toEqual([
      ids[1],
    ]);
  });

  it.each([
    ['especialidad', () => ({ especialidadId: primaria }), [1]],
    ['año de ingreso', () => ({ anioIngreso: 2023 }), [0]],
    ['condición', () => ({ condicion: 'EGRESADO' }), [2]],
    ['bloqueado', () => ({ bloqueado: 'true' }), [2]],
    ['no bloqueado', () => ({ bloqueado: 'false' }), [0, 1]],
  ] as const)('filtra por %s', async (_caso, filtro, esperados) => {
    const r = await listar({ texto: 'zapana', ...filtro() });
    expect(r.body.datos.map((f: { id: number }) => f.id)).toEqual(esperados.map((i) => ids[i]));
  });

  it('pagina', async () => {
    const r = await listar({ texto: 'zapana', pagina: 2, porPagina: 2 });
    expect(r.body).toMatchObject({ pagina: 2, porPagina: 2, total: 3 });
    expect(r.body.datos.map((f: { nombre: string }) => f.nombre)).toEqual(['Beto Zapana Apaza']);
  });

  it('el personal lee (SEC_DIR) y ve el bloqueo con su motivo', async () => {
    const r = await como('get', `/files/${ids[2]}`, undefined, 'SEC_DIR');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ bloqueado: true, motivoBloqueo: 'Permiso obligatorio' });
  });

  it('inexistente: 404', async () => {
    const r = await como('get', '/files/999999');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('NO_ENCONTRADO');
  });
});

describe('PATCH /api/v1/files/:id', () => {
  it('cambia solo lo enviado (persona y file) y registra EDITAR con antes y después', async () => {
    const { id, codigo } = await crear();
    const nuevo = nuevoCodigo();
    const r = await como('patch', `/files/${id}`, {
      celular: '79999999',
      codigo: nuevo,
      especialidadId: primaria,
      condicion: 'EGRESADO',
      nombres: 'Juana',
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      celular: '79999999',
      codigo: nuevo,
      especialidadId: primaria,
      especialidad: 'Educación Primaria Comunitaria Vocacional',
      condicion: 'EGRESADO',
      apellidoPaterno: 'Mamani',
    });
    const [evento] = await eventos(id, 'EDITAR');
    expect(evento).toMatchObject({
      usuarioId: kardexId,
      datosAntes: { celular: null, codigo, especialidadId: matematica, condicion: 'ESTUDIANTE' },
      datosDespues: { celular: '79999999', codigo: nuevo, especialidadId: primaria, condicion: 'EGRESADO' },
    });
  });

  it('género, modalidad y año de formación del folder personal (DEC-051)', async () => {
    const creado = await como('post', '/files', datosNuevo());
    expect(creado.body).toMatchObject({ genero: null, modalidad: 'A', anioFormacion: null });
    const r = await como('patch', `/files/${creado.body.id}`, {
      genero: 'FEMENINO',
      modalidad: 'b1',
      anioFormacion: 4,
    });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ genero: 'FEMENINO', modalidad: 'B1', anioFormacion: 4 });
    expect((await eventos(creado.body.id, 'EDITAR')).at(-1)).toMatchObject({
      datosAntes: { genero: null, modalidad: 'A', anioFormacion: null },
      datosDespues: { genero: 'FEMENINO', modalidad: 'B1', anioFormacion: 4 },
    });
    for (const malo of [{ anioFormacion: 6 }, { modalidad: 'B' }, { genero: 'OTRO' }]) {
      expect((await como('patch', `/files/${creado.body.id}`, malo)).status).toBe(400);
    }
  });

  it('D-45: un estudiante se registra con su modalidad (A, B1, B2 o B3); un egresado puede no tenerla', async () => {
    const sin = await como('post', '/files', datosNuevo({ modalidad: null }));
    expect(sin.status).toBe(400);
    expect(sin.body.error.details[0]).toMatchObject({ ruta: 'body.modalidad' });
    expect((await como('post', '/files', datosNuevo({ modalidad: 'B' }))).status).toBe(400);
    expect((await como('post', '/files', datosNuevo({ modalidad: null, condicion: 'EGRESADO' }))).status).toBe(201);
  });

  it('fecha de nacimiento: se guarda y se registra como texto', async () => {
    const { id } = await crear();
    const r = await como('patch', `/files/${id}`, { fechaNacimiento: '2003-01-31' });
    expect(r.body.fechaNacimiento).toBe('2003-01-31');
    const [evento] = await eventos(id, 'EDITAR');
    expect(evento).toMatchObject({
      datosAntes: { fechaNacimiento: '2004-05-10' },
      datosDespues: { fechaNacimiento: '2003-01-31' },
    });
  });

  it('sin cambios reales: 200 sin evento', async () => {
    const { id } = await crear();
    expect((await como('patch', `/files/${id}`, { nombres: 'Juana', anioIngreso: 2024 })).status).toBe(200);
    expect(await eventos(id, 'EDITAR')).toHaveLength(0);
  });

  it('código de otro file: 409 CODIGO_EXISTENTE', async () => {
    const otro = await crear();
    const { id } = await crear();
    const r = await como('patch', `/files/${id}`, { codigo: otro.codigo });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CODIGO_EXISTENTE');
  });

  it.each([
    ['cuerpo vacío', {}],
    ['con el CI', { ci: '1234567' }],
    ['con el bloqueo', { bloqueado: true }],
    ['con el motivo de bloqueo', { motivoBloqueo: 'x' }],
  ])('%s: 400', async (_caso, cuerpo) => {
    const { id } = await crear();
    const r = await como('patch', `/files/${id}`, cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });

  it('quitar el único apellido: 400 y nada cambia', async () => {
    const { id } = await crear({ apellidoMaterno: null });
    expect((await como('patch', `/files/${id}`, { apellidoPaterno: null })).status).toBe(400);
    expect((await como('get', `/files/${id}`)).body.apellidoPaterno).toBe('Mamani');
  });

  it('SEC_DIR no edita: 403', async () => {
    const { id } = await crear();
    expect((await como('patch', `/files/${id}`, { celular: '1' }, 'SEC_DIR')).status).toBe(403);
  });
});

describe('GET /api/v1/catalogos/especialidades', () => {
  it('solo las activas, ordenadas por nombre', async () => {
    // Se borra al final: el test del seed cuenta las especialidades.
    const inactiva = await bd.especialidad.create({ data: { nombre: 'Zz Especialidad inactiva', activo: false } });
    try {
      const r = await como('get', '/catalogos/especialidades', undefined, 'SEC_DIR');
      expect(r.status).toBe(200);
      const nombres = (r.body as { nombre: string }[]).map((e) => e.nombre);
      expect(nombres).toContain('Matemática');
      expect(nombres).not.toContain(inactiva.nombre);
      expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')));
    } finally {
      await bd.especialidad.delete({ where: { id: inactiva.id } });
    }
  });
});

describe('GET /api/v1/files/mio (S2.7, DEC-043)', () => {
  /** Un usuario ESTUDIANTE para la persona dada, sin sede (D-24). */
  async function estudiante(personaId: number): Promise<string> {
    const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'ESTUDIANTE' } });
    const persona = await bd.persona.findUniqueOrThrow({ where: { id: personaId } });
    const u = await bd.usuario.create({
      data: {
        personaId,
        rolId: rol.id,
        username: persona.ci,
        passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
        debeCambiarPassword: false,
      },
    });
    return tokenDe(u.id, 'ESTUDIANTE');
  }
  const pedir = (ruta: string, token: string) =>
    request(app).get(`/api/v1${ruta}`).set('Authorization', `Bearer ${token}`);

  it('el estudiante lee su file y sus requisitos, sin id en la URL', async () => {
    const f = await crear();
    const { personaId } = await bd.fileAcademico.findUniqueOrThrow({ where: { id: f.id } });
    const token = await estudiante(personaId);

    const mio = await pedir('/files/mio', token);
    expect(mio.status).toBe(200);
    expect(mio.body).toMatchObject({ id: f.id, ci: f.ci, codigo: f.codigo });

    const req = await pedir('/files/mio/requisitos', token);
    expect(req.status).toBe(200);
    expect(Array.isArray(req.body)).toBe(true);
  });

  it('no lee otro file por id: 403', async () => {
    const propio = await crear();
    const otro = await crear();
    const { personaId } = await bd.fileAcademico.findUniqueOrThrow({ where: { id: propio.id } });
    const token = await estudiante(personaId);
    expect((await pedir(`/files/${otro.id}`, token)).status).toBe(403);
    expect((await pedir(`/files/${otro.id}/requisitos`, token)).status).toBe(403);
  });

  it('sin file: 404 con un mensaje para consultar a Kardex', async () => {
    const persona = await bd.persona.create({ data: { ci: nuevoCi(), nombres: 'Sin', apellidoPaterno: 'File' } });
    const r = await pedir('/files/mio', await estudiante(persona.id));
    expect(r.status).toBe(404);
    expect(r.body.error.message).toContain('Kardex');
  });

  it('el personal no usa /files/mio: 403', async () => {
    expect((await como('get', '/files/mio', undefined, 'SEC_DIR')).status).toBe(403);
  });
});
