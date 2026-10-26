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
let siguiente = 6800100;
const ids: Record<'KARDEX' | 'COORDINADOR', number> = { KARDEX: 0, COORDINADOR: 0 };
let especialidadId = 0;

async function crearUsuario(rol: 'KARDEX' | 'COORDINADOR') {
  const r = await bd.rol.findUniqueOrThrow({ where: { codigo: rol } });
  const ci = String(siguiente++);
  const persona = await bd.persona.create({
    data: { ci, nombres: 'María', apellidoPaterno: rol === 'KARDEX' ? 'Quispe' : 'Coord' },
  });
  return (
    await bd.usuario.create({
      data: {
        personaId: persona.id,
        rolId: r.id,
        username: ci,
        passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
        debeCambiarPassword: false,
      },
    })
  ).id;
}

const como = async (rol: 'KARDEX' | 'COORDINADOR', metodo: 'get' | 'put', ruta: string, cuerpo?: object) => {
  const { token } = await firmarAccessToken(
    { usuarioId: ids[rol], rol, sedeId: null, debeCambiarPassword: false },
    SECRETO_JWT_DE_PRUEBA,
    new Date(),
  );
  const r = request(app)[metodo](`/api/v1${ruta}`).set('Authorization', `Bearer ${token}`);
  return cuerpo ? r.send(cuerpo) : r;
};

async function nuevoFile(
  extra: {
    genero?: 'FEMENINO' | 'MASCULINO';
    modalidad?: string;
    anioFormacion?: number;
    condicion?: 'ESTUDIANTE' | 'EGRESADO';
  } = {},
): Promise<number> {
  const n = siguiente++;
  const persona = await bd.persona.create({
    data: { ci: String(n), nombres: 'Estudiante', apellidoPaterno: 'Requisitos' },
  });
  return (
    await bd.fileAcademico.create({
      data: { personaId: persona.id, codigoEstudiante: `REQ-${n}`, especialidadId, anioIngreso: 2024, ...extra },
    })
  ).id;
}

interface Item {
  codigo: string;
  aplica: boolean;
  obligatorio: boolean;
  porGestion: boolean;
  pideCurso: boolean;
}

/** Completa todo lo que se le pide al file: por gestión en 2025; los TACFI con curso y entidad. */
async function completarTodo(id: number) {
  const lista = (await como('KARDEX', 'get', `/files/${id}/requisitos`)).body as Item[];
  for (const r of lista.filter((x) => x.aplica && x.obligatorio)) {
    const res = await como('KARDEX', 'put', `/files/${id}/requisitos/${r.codigo}`, {
      estado: 'COMPLETO',
      fecha: '2026-01-10',
      ...(r.porGestion ? { gestion: '2025' } : {}),
      ...(r.pideCurso ? { nombreCurso: 'Curso', entidadEmisora: 'Entidad' } : {}),
    });
    expect(res.status, r.codigo).toBe(200);
  }
}

const eventos = (id: number) =>
  bd.logAuditoria.findMany({ where: { entidad: 'file_academico', entidadId: String(id) }, orderBy: { id: 'asc' } });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  ids.KARDEX = await crearUsuario('KARDEX');
  ids.COORDINADOR = await crearUsuario('COORDINADOR');
  especialidadId = (await bd.especialidad.findFirstOrThrow()).id;
});
afterAll(() => bd.$disconnect());

describe('requisitos del file (SDD S2.4, DEC-051, ADR-0007)', () => {
  it('lista los 27 requisitos en su orden, todo PENDIENTE sin registros (DEC-051, DEC-052)', async () => {
    const id = await nuevoFile();
    const r = await como('COORDINADOR', 'get', `/files/${id}/requisitos`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(27);
    expect(r.body.map((x: { orden: number }) => x.orden)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(r.body.find((x: Item) => x.codigo === 'TACFI_1')).toMatchObject({
      nombre: 'Certificado legalizado de TACFI – Artístico I',
      anioFormacion: 1,
      pideCurso: true,
      aplica: true,
      atrasado: false,
      estado: 'PENDIENTE',
      fecha: null,
      nombreCurso: null,
      registradoPor: null,
      actualizado: null,
      gestiones: [],
    });
    expect(r.body.find((x: Item) => x.codigo === 'MATRICULA')).toMatchObject({ porGestion: true, gestiones: [] });
  });

  it('libreta militar solo a varones; los de modalidad, solo a su modalidad exacta (D-45)', async () => {
    const aplica = async (id: number) =>
      Object.fromEntries(
        ((await como('KARDEX', 'get', `/files/${id}/requisitos`)).body as Item[]).map((x) => [x.codigo, x.aplica]),
      );
    const sinDatos = await aplica(await nuevoFile());
    expect(sinDatos).toMatchObject({ LIBRETA_MILITAR: false, CALIF_SECUNDARIA: false, ADMISION: true });
    const varonB3 = await aplica(await nuevoFile({ genero: 'MASCULINO', modalidad: 'B3' }));
    expect(varonB3).toMatchObject({
      LIBRETA_MILITAR: true,
      CALIF_SECUNDARIA: false,
      CARNET_DISCAPACIDAD: true,
      PUEBLO_INDIGENA: false,
    });
    // D-45b: el certificado de secundaria es solo de B1.
    expect(await aplica(await nuevoFile({ modalidad: 'B1' }))).toMatchObject({ CALIF_SECUNDARIA: true });
    expect(await aplica(await nuevoFile({ modalidad: 'A' }))).toMatchObject({ CALIF_SECUNDARIA: false });
  });

  it('D-47: en 3.º año la matrícula pide 3 años y el certificado de notas 2; dos semestres son un año', async () => {
    const id = await nuevoFile({ anioFormacion: 3 });
    const estado = async (c: string) =>
      (
        (await como('KARDEX', 'get', `/files/${id}/requisitos`)).body as (Item & {
          estado: string;
          gestionesEsperadas: number;
        })[]
      ).find((x) => x.codigo === c)!;
    const poner = (c: string, gestion: string) =>
      como('KARDEX', 'put', `/files/${id}/requisitos/${c}`, { estado: 'COMPLETO', fecha: '2026-03-01', gestion });
    expect(await estado('MATRICULA')).toMatchObject({ gestionesEsperadas: 3, estado: 'PENDIENTE' });
    expect(await estado('CERT_NOTAS')).toMatchObject({ gestionesEsperadas: 2 });
    for (const g of ['2024', 'I/2025', 'II/2025']) await poner('MATRICULA', g);
    expect((await estado('MATRICULA')).estado).toBe('PENDIENTE');
    await poner('MATRICULA', 'I/2026');
    expect((await estado('MATRICULA')).estado).toBe('COMPLETO');
    for (const g of ['2024', 'II/2025']) await poner('CERT_NOTAS', g);
    expect((await estado('CERT_NOTAS')).estado).toBe('COMPLETO');
  });

  it('matrícula por gestión: una fila por gestión, resumen del estado y la gestión en la bitácora', async () => {
    const id = await nuevoFile();
    const sin = await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'COMPLETO',
      fecha: '2026-03-01',
    });
    expect(sin.status).toBe(400);
    expect(sin.body.error.details[0]).toMatchObject({ ruta: 'body.gestion' });

    await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'COMPLETO',
      fecha: '2026-03-01',
      gestion: 'i/2026',
    });
    const r = await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'OBSERVADO',
      observacion: 'Falta la copia del file',
      gestion: 'II/2025',
    });
    expect(r.body).toMatchObject({ estado: 'OBSERVADO', fecha: null });
    expect(r.body.gestiones.map((g: { gestion: string; estado: string }) => [g.gestion, g.estado])).toEqual([
      ['I/2026', 'COMPLETO'],
      ['II/2025', 'OBSERVADO'],
    ]);
    expect(await bd.requisitoFile.count({ where: { fileId: id } })).toBe(2);
    expect((await eventos(id)).at(-1)).toMatchObject({ datosDespues: { requisito: 'MATRICULA', gestion: 'II/2025' } });

    const otro = await como('KARDEX', 'put', `/files/${id}/requisitos/ADMISION`, {
      estado: 'PENDIENTE',
      gestion: '2025',
    });
    expect(otro.status).toBe(400);
  });

  it('entregas (SDD OBS-T1, #3): cada registro de Kardex, del más nuevo al más viejo, con lo que cambió', async () => {
    const id = await nuevoFile();
    expect((await como('KARDEX', 'get', `/files/${id}/entregas`)).body).toEqual([]);
    await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'COMPLETO',
      fecha: '2026-03-01',
      nroDocumento: 'V-123',
      gestion: '2026',
    });
    await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'COMPLETO',
      fecha: '2026-03-02',
      nroDocumento: 'V-123',
      gestion: '2026',
    });
    // Sin cambios reales no hay evento, así que tampoco entrega.
    await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'COMPLETO',
      fecha: '2026-03-02',
      nroDocumento: 'V-123',
      gestion: '2026',
    });
    const r = await como('COORDINADOR', 'get', `/files/${id}/entregas`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(2);
    const [ultima, primera] = r.body;
    expect(ultima.nro).toBeGreaterThan(primera.nro);
    expect(ultima).toMatchObject({
      codigo: 'MATRICULA',
      gestion: '2026',
      cambios: [{ campo: 'fecha', antes: '2026-03-01', despues: '2026-03-02' }],
      registradoPor: { id: ids.KARDEX, nombre: expect.stringContaining('María') },
    });
    expect(primera.cambios).toEqual(
      expect.arrayContaining([
        { campo: 'estado', antes: 'PENDIENTE', despues: 'COMPLETO' },
        { campo: 'nroDocumento', antes: null, despues: 'V-123' },
      ]),
    );
    expect(primera.nombre).not.toBe('MATRICULA');
    expect((await como('KARDEX', 'get', '/files/99999999/entregas')).status).toBe(404);
  });

  it('TACFI: completo exige curso y entidad emisora; los demás no los aceptan', async () => {
    const id = await nuevoFile();
    const falta = await como('KARDEX', 'put', `/files/${id}/requisitos/TACFI_TEC_1`, {
      estado: 'COMPLETO',
      fecha: '2025-04-08',
    });
    expect(falta.status).toBe(400);
    expect(falta.body.error.details.map((d: { ruta: string }) => d.ruta)).toEqual([
      'body.nombreCurso',
      'body.entidadEmisora',
    ]);
    const ok = await como('KARDEX', 'put', `/files/${id}/requisitos/TACFI_TEC_1`, {
      estado: 'COMPLETO',
      fecha: '2025-04-08',
      nombreCurso: 'Inteligencia artificial aplicada al modelo educativo',
      entidadEmisora: 'Instituto Tecnológico Superior',
    });
    expect(ok.body).toMatchObject({
      nombreCurso: 'Inteligencia artificial aplicada al modelo educativo',
      entidadEmisora: 'Instituto Tecnológico Superior',
    });
    const ajeno = await como('KARDEX', 'put', `/files/${id}/requisitos/REJAP`, {
      estado: 'PENDIENTE',
      nombreCurso: 'x',
    });
    expect(ajeno.status).toBe(400);
  });

  it('D-31: en 3.º año, los TACFI y las defensas del TCLOA de años pasados que faltan están atrasados (rojo)', async () => {
    const id = await nuevoFile({ anioFormacion: 3 });
    const lista = (await como('KARDEX', 'get', `/files/${id}/requisitos`)).body as (Item & { atrasado: boolean })[];
    expect(lista.filter((x) => x.atrasado).map((x) => x.codigo)).toEqual([
      'TCLO_BASICO',
      'TCLO_INTERMEDIO',
      'TACFI_1',
      'TACFI_2',
    ]);
    expect((await como('KARDEX', 'get', `/files/${id}`)).body.semaforo).toBe('ROJO');
    for (const c of ['TACFI_1', 'TACFI_2', 'TCLO_BASICO', 'TCLO_INTERMEDIO']) {
      await como('KARDEX', 'put', `/files/${id}/requisitos/${c}`, {
        estado: 'COMPLETO',
        fecha: '2024-10-01',
        ...(c.startsWith('TACFI') ? { nombreCurso: 'Curso', entidadEmisora: 'Entidad' } : {}),
      });
    }
    expect((await como('KARDEX', 'get', `/files/${id}`)).body.semaforo).toBe('AMARILLO');
  });

  it('un requisito inactivo del catálogo no aparece', async () => {
    const id = await nuevoFile();
    await bd.requisitoTipo.update({ where: { codigo: 'CERT_NOTAS' }, data: { activo: false } });
    try {
      const r = await como('KARDEX', 'get', `/files/${id}/requisitos`);
      expect(r.body.map((x: { codigo: string }) => x.codigo)).not.toContain('CERT_NOTAS');
    } finally {
      await bd.requisitoTipo.update({ where: { codigo: 'CERT_NOTAS' }, data: { activo: true } });
    }
  });

  it('OBSERVADO y después COMPLETO: una sola fila, registrado por Kardex, eventos con solo lo que cambió', async () => {
    const id = await nuevoFile();
    const obs = await como('KARDEX', 'put', `/files/${id}/requisitos/cert_tcloa`, {
      estado: 'OBSERVADO',
      observacion: 'No se presentó; reprogramada para la gestión siguiente',
    });
    expect(obs.status).toBe(200);
    expect(obs.body).toMatchObject({
      codigo: 'CERT_TCLOA',
      estado: 'OBSERVADO',
      registradoPor: { id: ids.KARDEX, nombre: 'María Quispe' },
    });

    const ok = await como('KARDEX', 'put', `/files/${id}/requisitos/CERT_TCLOA`, {
      estado: 'COMPLETO',
      fecha: '2026-08-14',
      nroDocumento: 'TCLO-0451',
      observacion: 'No se presentó; reprogramada para la gestión siguiente',
    });
    expect(ok.body).toMatchObject({ estado: 'COMPLETO', fecha: '2026-08-14', nroDocumento: 'TCLO-0451' });
    expect(await bd.requisitoFile.count({ where: { fileId: id } })).toBe(1);

    const evs = await eventos(id);
    expect(evs.map((e) => e.accion)).toEqual(['EDITAR', 'EDITAR']);
    expect(evs[1]).toMatchObject({
      usuarioId: ids.KARDEX,
      modulo: 'FILES',
      datosAntes: { requisito: 'CERT_TCLOA', estado: 'OBSERVADO', fecha: null, nroDocumento: null },
      datosDespues: { requisito: 'CERT_TCLOA', estado: 'COMPLETO', fecha: '2026-08-14', nroDocumento: 'TCLO-0451' },
    });
    expect(evs[1].datosDespues).not.toHaveProperty('observacion');
  });

  it('sin cambios reales: 200 sin escribir ni registrar', async () => {
    const id = await nuevoFile();
    const r = await como('KARDEX', 'put', `/files/${id}/requisitos/TACFI_1`, { estado: 'PENDIENTE' });
    expect(r.status).toBe(200);
    expect(await bd.requisitoFile.count({ where: { fileId: id } })).toBe(0);
    expect(await eventos(id)).toHaveLength(0);
  });

  it.each([
    ['COMPLETO sin fecha', { estado: 'COMPLETO' }],
    ['OBSERVADO sin observación', { estado: 'OBSERVADO', observacion: ' ' }],
    ['fecha futura', { estado: 'COMPLETO', fecha: '2099-01-01' }],
    ['estado desconocido', { estado: 'APROBADO' }],
    ['campo desconocido', { estado: 'PENDIENTE', nivel: 'BASICO' }],
  ])('%s: 400 VALIDACION', async (_caso, cuerpo) => {
    const id = await nuevoFile();
    const r = await como('KARDEX', 'put', `/files/${id}/requisitos/TACFI_1`, cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });

  it('código o file inexistente: 404', async () => {
    const id = await nuevoFile();
    expect((await como('KARDEX', 'put', `/files/${id}/requisitos/NO_EXISTE`, { estado: 'PENDIENTE' })).status).toBe(
      404,
    );
    expect((await como('KARDEX', 'get', '/files/999999/requisitos')).status).toBe(404);
  });

  it('COORDINADOR lee pero no registra', async () => {
    const id = await nuevoFile();
    expect((await como('COORDINADOR', 'put', `/files/${id}/requisitos/TACFI_1`, { estado: 'PENDIENTE' })).status).toBe(
      403,
    );
  });

  it('GET /catalogos/requisitos: el catálogo activo', async () => {
    const r = await como('COORDINADOR', 'get', '/catalogos/requisitos');
    expect(r.status).toBe(200);
    expect(r.body).toHaveLength(27);
    expect(r.body[0]).toMatchObject({ codigo: 'ADMISION', orden: 1, obligatorio: true, porGestion: false });
  });

  it('semáforo del file (S2.5, ADR-0007): amarillo sin registros, rojo con un observado o bloqueado, verde con todo completo', async () => {
    const id = await nuevoFile();
    const color = async () => (await como('KARDEX', 'get', `/files/${id}`)).body.semaforo as string;
    expect(await color()).toBe('AMARILLO');

    await como('KARDEX', 'put', `/files/${id}/requisitos/CERT_TCLOA`, {
      estado: 'OBSERVADO',
      observacion: 'No se presentó',
    });
    expect(await color()).toBe('ROJO');

    await completarTodo(id);
    expect(await color()).toBe('VERDE');

    // Una gestión observada de la matrícula pone rojo; un requisito no obligatorio no cuenta.
    await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'OBSERVADO',
      observacion: 'Sin copia',
      gestion: 'I/2026',
    });
    expect(await color()).toBe('ROJO');
    await como('KARDEX', 'put', `/files/${id}/requisitos/MATRICULA`, {
      estado: 'COMPLETO',
      fecha: '2026-03-01',
      gestion: 'I/2026',
    });
    expect(await color()).toBe('VERDE');
    await como('KARDEX', 'put', `/files/${id}/requisitos/LICENCIA_TEMPORAL`, {
      estado: 'OBSERVADO',
      observacion: 'No corresponde',
    });
    expect(await color()).toBe('VERDE');

    await bd.fileAcademico.update({ where: { id }, data: { bloqueado: true, motivoBloqueo: 'Permiso obligatorio' } });
    expect(await color()).toBe('ROJO');
  });

  it('GET /files?semaforo= filtra por el color calculado', async () => {
    const verde = await nuevoFile();
    await completarTodo(verde);
    const amarillo = await nuevoFile();
    const ids = async (color: string) =>
      (
        (await como('KARDEX', 'get', `/files?texto=Requisitos&semaforo=${color}&porPagina=100`)).body.datos as {
          id: number;
        }[]
      ).map((f) => f.id);
    expect(await ids('VERDE')).toContain(verde);
    expect(await ids('VERDE')).not.toContain(amarillo);
    expect(await ids('AMARILLO')).toContain(amarillo);
    expect((await como('KARDEX', 'get', '/files?semaforo=AZUL')).status).toBe(400);
  });

  it('DEC-060: el egresado no tiene requisitos ni semáforo, y no se le registran', async () => {
    const id = await nuevoFile({ condicion: 'EGRESADO', anioFormacion: 3 });
    expect((await como('KARDEX', 'get', `/files/${id}/requisitos`)).body).toEqual([]);
    expect((await como('KARDEX', 'get', `/files/${id}`)).body.semaforo).toBeNull();
    const res = await como('KARDEX', 'put', `/files/${id}/requisitos/CERT_TCLOA`, {
      estado: 'COMPLETO',
      fecha: '2026-01-10',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('FILE_EGRESADO');
    const rojos = (await como('KARDEX', 'get', '/files?texto=Requisitos&semaforo=ROJO&porPagina=100')).body.datos as {
      id: number;
    }[];
    expect(rojos.map((f) => f.id)).not.toContain(id);
  });
});
