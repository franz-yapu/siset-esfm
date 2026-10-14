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

async function nuevoFile(): Promise<number> {
  const n = siguiente++;
  const persona = await bd.persona.create({
    data: { ci: String(n), nombres: 'Estudiante', apellidoPaterno: 'Requisitos' },
  });
  return (
    await bd.fileAcademico.create({
      data: { personaId: persona.id, codigoEstudiante: `REQ-${n}`, especialidadId, anioIngreso: 2024 },
    })
  ).id;
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

describe('requisitos del file (SDD S2.4, D-04, D-04b)', () => {
  it('lista el catálogo activo, en orden, todo PENDIENTE sin registros', async () => {
    const id = await nuevoFile();
    const r = await como('COORDINADOR', 'get', `/files/${id}/requisitos`);
    expect(r.status).toBe(200);
    expect(r.body.map((x: { codigo: string }) => x.codigo)).toEqual([
      'TACFI_1',
      'TCLO_BASICO',
      'TACFI_2',
      'TCLO_INTERMEDIO',
      'TCLO_AVANZADO',
      'CERT_NOTAS',
    ]);
    expect(r.body[1]).toMatchObject({
      nombre: 'TCLO nivel básico',
      anioFormacion: 1,
      nivel: 'BASICO',
      estado: 'PENDIENTE',
      fecha: null,
      registradoPor: null,
      actualizado: null,
    });
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
    const obs = await como('KARDEX', 'put', `/files/${id}/requisitos/tclo_basico`, {
      estado: 'OBSERVADO',
      observacion: 'No se presentó; reprogramada para la gestión siguiente',
    });
    expect(obs.status).toBe(200);
    expect(obs.body).toMatchObject({
      codigo: 'TCLO_BASICO',
      estado: 'OBSERVADO',
      registradoPor: { id: ids.KARDEX, nombre: 'María Quispe' },
    });

    const ok = await como('KARDEX', 'put', `/files/${id}/requisitos/TCLO_BASICO`, {
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
      datosAntes: { requisito: 'TCLO_BASICO', estado: 'OBSERVADO', fecha: null, nroDocumento: null },
      datosDespues: { requisito: 'TCLO_BASICO', estado: 'COMPLETO', fecha: '2026-08-14', nroDocumento: 'TCLO-0451' },
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
    expect(r.body[0]).toMatchObject({ codigo: 'TACFI_1', anioFormacion: 1, obligatorio: true });
  });

  it('semáforo del file (S2.5): amarillo sin registros, rojo con un observado o bloqueado, verde con todo completo', async () => {
    const id = await nuevoFile();
    const color = async () => (await como('KARDEX', 'get', `/files/${id}`)).body.semaforo as string;
    expect(await color()).toBe('AMARILLO');

    await como('KARDEX', 'put', `/files/${id}/requisitos/TCLO_BASICO`, {
      estado: 'OBSERVADO',
      observacion: 'No se presentó',
    });
    expect(await color()).toBe('ROJO');

    const codigos = ['TACFI_1', 'TCLO_BASICO', 'TACFI_2', 'TCLO_INTERMEDIO', 'TCLO_AVANZADO', 'CERT_NOTAS'];
    for (const c of codigos) {
      await como('KARDEX', 'put', `/files/${id}/requisitos/${c}`, { estado: 'COMPLETO', fecha: '2026-01-10' });
    }
    expect(await color()).toBe('VERDE');

    // Un requisito no obligatorio no cuenta.
    await bd.requisitoTipo.update({ where: { codigo: 'CERT_NOTAS' }, data: { obligatorio: false } });
    try {
      await como('KARDEX', 'put', `/files/${id}/requisitos/CERT_NOTAS`, { estado: 'PENDIENTE' });
      expect(await color()).toBe('VERDE');
    } finally {
      await bd.requisitoTipo.update({ where: { codigo: 'CERT_NOTAS' }, data: { obligatorio: true } });
    }

    const r = await como('KARDEX', 'put', `/files/${id}/requisitos/CERT_NOTAS`, {
      estado: 'COMPLETO',
      fecha: '2026-01-10',
    });
    expect(r.status).toBe(200);
    await bd.fileAcademico.update({ where: { id }, data: { bloqueado: true, motivoBloqueo: 'Permiso obligatorio' } });
    expect(await color()).toBe('ROJO');
  });

  it('GET /files?semaforo= filtra por el color calculado', async () => {
    const verde = await nuevoFile();
    for (const c of ['TACFI_1', 'TCLO_BASICO', 'TACFI_2', 'TCLO_INTERMEDIO', 'TCLO_AVANZADO', 'CERT_NOTAS']) {
      await como('KARDEX', 'put', `/files/${verde}/requisitos/${c}`, { estado: 'COMPLETO', fecha: '2026-01-10' });
    }
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
});
