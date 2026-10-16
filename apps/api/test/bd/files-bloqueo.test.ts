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
let siguiente = 6700100;
let kardexId = 0;
let especialidadId = 0;

const GLOSA = 'Licencia temporal obligatoria por reprobación, gestión 2026';
const PDF = Buffer.from('%PDF-1.7\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n', 'latin1');
const DATOS = {
  causa: 'LICENCIA_OBLIGATORIA',
  nroResolucion: 'RA-045/2026',
  fechaResolucion: '2026-10-10',
  glosa: GLOSA,
} as const;

const token = async () =>
  (
    await firmarAccessToken(
      { usuarioId: kardexId, rol: 'KARDEX', sedeId: null, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;
const post = async (ruta: string, cuerpo?: object) => {
  const r = request(app)
    .post(`/api/v1${ruta}`)
    .set('Authorization', `Bearer ${await token()}`);
  return cuerpo ? r.send(cuerpo) : r;
};
const get = async (ruta: string) =>
  request(app)
    .get(`/api/v1${ruta}`)
    .set('Authorization', `Bearer ${await token()}`);

/** El formulario del bloqueo (multipart): los campos que se pasen y, si hay, el PDF. */
const bloquear = async (
  id: number,
  campos: Record<string, string> = DATOS,
  pdf: { contenido: Buffer; nombre: string } | null = { contenido: PDF, nombre: 'RA-045-2026.pdf' },
) => {
  let r = request(app)
    .post(`/api/v1/files/${id}/bloqueo`)
    .set('Authorization', `Bearer ${await token()}`);
  for (const [k, v] of Object.entries(campos)) r = r.field(k, v);
  if (pdf) r = r.attach('pdf', pdf.contenido, { filename: pdf.nombre, contentType: 'application/pdf' });
  return r;
};

async function nuevoFile(): Promise<number> {
  const n = siguiente++;
  const persona = await bd.persona.create({
    data: { ci: String(n), nombres: 'Estudiante', apellidoPaterno: 'Bloqueo' },
  });
  const f = await bd.fileAcademico.create({
    data: { personaId: persona.id, codigoEstudiante: `BLQ-${n}`, especialidadId, anioIngreso: 2024 },
  });
  return f.id;
}

const eventos = (id: number) =>
  bd.logAuditoria.findMany({ where: { entidad: 'file_academico', entidadId: String(id) }, orderBy: { id: 'asc' } });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
  const persona = await bd.persona.create({ data: { ci: '6700001', nombres: 'Kardex', apellidoPaterno: 'Bloqueo' } });
  kardexId = (
    await bd.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        username: '6700001',
        passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
        debeCambiarPassword: false,
      },
    })
  ).id;
  especialidadId = (await bd.especialidad.findFirstOrThrow()).id;
});
afterAll(() => bd.$disconnect());

describe('bloqueo del file con resolución y PDF (D-29, DEC-049)', () => {
  it('bloquear: la glosa queda como motivo, la resolución en bloqueo_file y BLOQUEAR sin el PDF', async () => {
    const id = await nuevoFile();
    const r = await bloquear(id, { ...DATOS, glosa: `  ${GLOSA} ` });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id, bloqueado: true, motivoBloqueo: GLOSA });

    const fila = await bd.bloqueoFile.findFirstOrThrow({ where: { fileId: id } });
    expect(fila).toMatchObject({
      causa: 'LICENCIA_OBLIGATORIA',
      nroResolucion: 'RA-045/2026',
      glosa: GLOSA,
      pdfNombre: 'RA-045-2026.pdf',
      bloqueadoPor: kardexId,
      desbloqueadoEn: null,
    });
    expect(Buffer.from(fila.pdf).equals(PDF)).toBe(true);

    const [e] = await eventos(id);
    expect(e).toMatchObject({
      accion: 'BLOQUEAR',
      modulo: 'FILES',
      usuarioId: kardexId,
      datosAntes: { bloqueado: false },
      datosDespues: {
        bloqueado: true,
        motivo: GLOSA,
        causa: 'LICENCIA_OBLIGATORIA',
        resolucion: 'RA-045/2026',
        fechaResolucion: '2026-10-10',
        pdf: { nombre: 'RA-045-2026.pdf', bytes: PDF.length },
      },
    });
  });

  it('ver el bloqueo y descargar el PDF', async () => {
    const id = await nuevoFile();
    await bloquear(id, { ...DATOS, causa: 'LICENCIA_VOLUNTARIA' });
    const b = await get(`/files/${id}/bloqueo`);
    expect(b.status).toBe(200);
    expect(b.body).toMatchObject({
      causa: 'LICENCIA_VOLUNTARIA',
      nroResolucion: 'RA-045/2026',
      fechaResolucion: '2026-10-10',
      glosa: GLOSA,
      pdfNombre: 'RA-045-2026.pdf',
      bloqueadoPor: { id: kardexId, nombre: 'Kardex Bloqueo' },
    });
    expect(b.body).not.toHaveProperty('pdf');

    const pdf = await request(app)
      .get(`/api/v1/files/${id}/bloqueo/pdf`)
      .set('Authorization', `Bearer ${await token()}`)
      .buffer(true);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toContain('RA-045-2026.pdf');
    expect(Buffer.from(pdf.body as Buffer).equals(PDF)).toBe(true);
  });

  it('desbloquear: sin datos; cierra el bloqueo con quién y cuándo, y DESBLOQUEAR guarda la resolución', async () => {
    const id = await nuevoFile();
    await bloquear(id);
    const r = await post(`/files/${id}/desbloqueo`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ bloqueado: false, motivoBloqueo: null });
    const fila = await bd.bloqueoFile.findFirstOrThrow({ where: { fileId: id } });
    expect(fila.desbloqueadoPor).toBe(kardexId);
    expect(fila.desbloqueadoEn).toBeInstanceOf(Date);
    const e = (await eventos(id)).at(-1);
    expect(e).toMatchObject({
      accion: 'DESBLOQUEAR',
      datosAntes: { bloqueado: true, motivo: GLOSA, resolucion: 'RA-045/2026' },
      datosDespues: { bloqueado: false },
    });
    expect((await get(`/files/${id}/bloqueo`)).body).toBeNull();
    expect((await get(`/files/${id}/bloqueo/pdf`)).status).toBe(404);
  });

  it('se puede volver a bloquear: el historial guarda los dos bloqueos', async () => {
    const id = await nuevoFile();
    await bloquear(id);
    await post(`/files/${id}/desbloqueo`, {});
    expect((await bloquear(id, { ...DATOS, nroResolucion: 'RA-050/2026' })).status).toBe(200);
    const filas = await bd.bloqueoFile.findMany({ where: { fileId: id }, orderBy: { id: 'asc' } });
    expect(filas.map((f) => [f.nroResolucion, f.desbloqueadoEn === null])).toEqual([
      ['RA-045/2026', false],
      ['RA-050/2026', true],
    ]);
  });

  it('un file bloqueado antes de DEC-049 (sin resolución) se desbloquea igual', async () => {
    const id = await nuevoFile();
    await bd.fileAcademico.update({ where: { id }, data: { bloqueado: true, motivoBloqueo: 'Permiso obligatorio' } });
    expect((await get(`/files/${id}/bloqueo`)).body).toBeNull();
    const r = await post(`/files/${id}/desbloqueo`, {});
    expect(r.status).toBe(200);
    expect((await eventos(id)).at(-1)).toMatchObject({ datosAntes: { resolucion: null } });
  });

  it('repetir la operación: 422 ESTADO_SIN_CAMBIO y sin evento', async () => {
    const id = await nuevoFile();
    const libre = await post(`/files/${id}/desbloqueo`, {});
    expect(libre.status).toBe(422);
    expect(libre.body.error.code).toBe('ESTADO_SIN_CAMBIO');
    await bloquear(id);
    const otra = await bloquear(id);
    expect(otra.status).toBe(422);
    expect((await eventos(id)).map((e) => e.accion)).toEqual(['BLOQUEAR']);
    expect(await bd.bloqueoFile.count({ where: { fileId: id } })).toBe(1);
  });

  const { glosa: _g, ...sinGlosa } = DATOS;
  it.each([
    ['sin glosa', sinGlosa, undefined, 'body.glosa'],
    ['causa desconocida', { ...DATOS, causa: 'OTRA' }, undefined, 'body.causa'],
    ['fecha futura', { ...DATOS, fechaResolucion: '2100-01-01' }, undefined, 'body.fechaResolucion'],
    ['campo desconocido', { ...DATOS, otro: '1' }, undefined, 'body'],
    ['sin PDF', DATOS, null, 'body.pdf'],
    ['archivo que no es PDF', DATOS, { contenido: Buffer.from('hola'), nombre: 'x.pdf' }, 'body.pdf'],
    [
      'PDF de más de 5 MB',
      DATOS,
      { contenido: Buffer.concat([PDF, Buffer.alloc(5 * 1024 * 1024)]), nombre: 'grande.pdf' },
      'body.pdf',
    ],
  ])('%s: 400 VALIDACION y sin escribir', async (_caso, campos, pdf, ruta) => {
    const id = await nuevoFile();
    const r = await bloquear(id, campos, pdf);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
    expect(r.body.error.details.map((d: { ruta: string }) => d.ruta)).toContain(ruta);
    expect(await bd.bloqueoFile.count({ where: { fileId: id } })).toBe(0);
    expect(await eventos(id)).toEqual([]);
  });

  it('desbloqueo con campos: 400 VALIDACION', async () => {
    const id = await nuevoFile();
    await bloquear(id);
    expect((await post(`/files/${id}/desbloqueo`, { resolucion: 'RA-1' })).status).toBe(400);
  });

  it('file inexistente: 404', async () => {
    expect((await bloquear(999999)).status).toBe(404);
    expect((await get('/files/999999/bloqueo')).status).toBe(404);
  });
});
