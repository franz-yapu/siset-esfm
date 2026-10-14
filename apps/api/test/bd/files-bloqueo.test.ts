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

const MOTIVO = 'Permiso obligatorio por reprobación, gestión 2026';

const token = async () =>
  (
    await firmarAccessToken(
      { usuarioId: kardexId, rol: 'KARDEX', sedeId: null, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;
const post = async (ruta: string, cuerpo: object) =>
  request(app)
    .post(`/api/v1${ruta}`)
    .set('Authorization', `Bearer ${await token()}`)
    .send(cuerpo);

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

describe('bloqueo del file por permiso obligatorio (SDD S2.6, D-07b)', () => {
  it('bloquear: el file queda bloqueado con su motivo y BLOQUEAR registra antes y después', async () => {
    const id = await nuevoFile();
    const r = await post(`/files/${id}/bloqueo`, { motivo: `  ${MOTIVO} ` });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id, bloqueado: true, motivoBloqueo: MOTIVO });
    const [e] = await eventos(id);
    expect(e).toMatchObject({
      accion: 'BLOQUEAR',
      modulo: 'FILES',
      usuarioId: kardexId,
      datosAntes: { bloqueado: false },
      datosDespues: { bloqueado: true, motivo: MOTIVO },
    });
  });

  it('desbloquear: sin motivo en el file y la resolución en DESBLOQUEAR', async () => {
    const id = await nuevoFile();
    await post(`/files/${id}/bloqueo`, { motivo: MOTIVO });
    const r = await post(`/files/${id}/desbloqueo`, { resolucion: 'RA-045/2026' });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ bloqueado: false, motivoBloqueo: null });
    const e = (await eventos(id)).at(-1);
    expect(e).toMatchObject({
      accion: 'DESBLOQUEAR',
      datosAntes: { bloqueado: true, motivo: MOTIVO },
      datosDespues: { bloqueado: false, resolucion: 'RA-045/2026' },
    });
  });

  it('repetir la operación: 422 ESTADO_SIN_CAMBIO y sin evento', async () => {
    const id = await nuevoFile();
    const libre = await post(`/files/${id}/desbloqueo`, { resolucion: 'RA-1' });
    expect(libre.status).toBe(422);
    expect(libre.body.error.code).toBe('ESTADO_SIN_CAMBIO');
    await post(`/files/${id}/bloqueo`, { motivo: MOTIVO });
    const otra = await post(`/files/${id}/bloqueo`, { motivo: MOTIVO });
    expect(otra.status).toBe(422);
    expect((await eventos(id)).map((e) => e.accion)).toEqual(['BLOQUEAR']);
  });

  it.each([
    ['bloqueo sin motivo', 'bloqueo', {}],
    ['bloqueo con motivo corto', 'bloqueo', { motivo: 'x' }],
    ['desbloqueo sin resolución', 'desbloqueo', { resolucion: '  ' }],
    ['campo desconocido', 'bloqueo', { motivo: MOTIVO, otro: 1 }],
  ])('%s: 400 VALIDACION', async (_caso, accion, cuerpo) => {
    const id = await nuevoFile();
    const r = await post(`/files/${id}/${accion}`, cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDACION');
  });

  it('file inexistente: 404', async () => {
    expect((await post('/files/999999/bloqueo', { motivo: MOTIVO })).status).toBe(404);
  });
});
