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
let siguiente = 6900100;

type Rol = 'SEC_DIR' | 'KARDEX' | 'COORDINADOR';
const personal: Record<Rol, { id: number; sedeId: number }> = {
  SEC_DIR: { id: 0, sedeId: 0 },
  KARDEX: { id: 0, sedeId: 0 },
  COORDINADOR: { id: 0, sedeId: 0 },
};
const sedes = { LA_PAZ: 0, ANCOCAGUA: 0 };
let especialidadId = 0;

async function crearUsuario(rol: Rol, sedeId: number) {
  const r = await bd.rol.findUniqueOrThrow({ where: { codigo: rol } });
  const ci = String(siguiente++);
  const persona = await bd.persona.create({ data: { ci, nombres: rol, apellidoPaterno: 'Trámites' } });
  const u = await bd.usuario.create({
    data: {
      personaId: persona.id,
      rolId: r.id,
      sedeId,
      username: ci,
      passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
      debeCambiarPassword: false,
    },
  });
  return { id: u.id, sedeId };
}

const token = async (rol: Rol, sedeId = personal[rol].sedeId) =>
  (
    await firmarAccessToken(
      { usuarioId: personal[rol].id, rol, sedeId, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;

const paso = async (rol: Rol, nro: string, accion: string, sedeId?: number, observacion?: string) =>
  request(app)
    .post(`/api/v1/hojas-ruta/${nro}/transiciones`)
    .set('Authorization', `Bearer ${await token(rol, sedeId)}`)
    .send({ accion, ...(observacion === undefined ? {} : { observacion }) });

/** Una hoja de ruta RECIBIDA (la ingesta llega con S3.4: aquí se inserta directo, con su movimiento). */
async function nuevaHoja(
  tipo: 'HISTORIAL_ACADEMICO' | 'CERT_NOTAS_ANTERIOR',
  bloqueado = false,
): Promise<{ nro: string; fileId: number }> {
  const n = siguiente++;
  const persona = await bd.persona.create({ data: { ci: String(n), nombres: 'Egresada', apellidoPaterno: 'Tramite' } });
  const file = await bd.fileAcademico.create({
    data: {
      personaId: persona.id,
      codigoEstudiante: `HR-${n}`,
      especialidadId,
      anioIngreso: 2018,
      condicion: 'EGRESADO',
      bloqueado,
      motivoBloqueo: bloqueado ? 'Permiso obligatorio' : null,
    },
  });
  const t = await bd.tipoTramite.findUniqueOrThrow({ where: { codigo: tipo } });
  // El N.º sale del correlativo (S3.2): con números fijos chocaría con las ingestas de otros tests.
  const [{ nro }] = await bd.$queryRaw<{ nro: string }[]>`SELECT fn_siguiente_nro_hoja_ruta(2026::smallint) AS nro`;
  const h = await bd.hojaRuta.create({
    data: {
      nroTramite: nro,
      gestion: 2026,
      fileId: file.id,
      tipoTramiteId: t.id,
      sedeActualId: sedes.LA_PAZ,
      nroValorado: tipo === 'HISTORIAL_ACADEMICO' ? `V-${n}` : null,
    },
  });
  await bd.movimientoHojaRuta.create({
    data: {
      hojaRutaId: h.id,
      accion: 'REGISTRAR',
      estadoNuevo: 'RECIBIDO',
      sedeId: sedes.LA_PAZ,
      usuarioId: personal.SEC_DIR.id,
    },
  });
  return { nro, fileId: file.id };
}

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  sedes.LA_PAZ = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'LA_PAZ' } })).id;
  sedes.ANCOCAGUA = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'ANCOCAGUA' } })).id;
  personal.SEC_DIR = await crearUsuario('SEC_DIR', sedes.LA_PAZ);
  personal.KARDEX = await crearUsuario('KARDEX', sedes.ANCOCAGUA);
  personal.COORDINADOR = await crearUsuario('COORDINADOR', sedes.ANCOCAGUA);
  especialidadId = (await bd.especialidad.findFirstOrThrow()).id;
});
afterAll(() => bd.$disconnect());

describe('máquina de estados de la hoja de ruta contra la base (SDD S3.1-S3.3, ADR-0005)', () => {
  it('flujo con valorado de punta a punta: un movimiento por paso, sede y cierre al entregar', async () => {
    const { nro } = await nuevaHoja('HISTORIAL_ACADEMICO');
    const pasos: [Rol, string, string][] = [
      ['SEC_DIR', 'AVISAR_KARDEX', 'AVISADO_KARDEX'],
      ['KARDEX', 'RECOGER', 'EN_IMPRESION'],
      ['KARDEX', 'IMPRIMIR', 'IMPRESO'],
      ['SEC_DIR', 'FIRMA_DIR_ACADEMICA', 'FIRMADO_DIR_ACADEMICA'],
      ['SEC_DIR', 'FIRMA_DIR_GENERAL', 'LISTO'],
      ['SEC_DIR', 'ENTREGAR', 'ENTREGADO'],
    ];
    for (const [rol, accion, estado] of pasos) {
      const r = await paso(rol, nro, accion);
      expect(r.status, `${accion}: ${JSON.stringify(r.body)}`).toBe(200);
      expect(r.body.estado).toBe(estado);
    }
    const h = await bd.hojaRuta.findUniqueOrThrow({ where: { nroTramite: nro }, include: { movimientos: true } });
    expect(h.movimientos).toHaveLength(7);
    expect(h.sedeActualId).toBe(sedes.LA_PAZ);
    expect(h.fechaCierre).not.toBeNull();
    const eventos = await bd.logAuditoria.findMany({
      where: { entidad: 'hoja_ruta', entidadId: nro },
      orderBy: { id: 'asc' },
    });
    expect(eventos.map((e) => e.accion)).toEqual(Array(6).fill('CAMBIAR_ESTADO'));
    expect(eventos[1]).toMatchObject({
      usuarioId: personal.KARDEX.id,
      modulo: 'HOJAS_RUTA',
      datosAntes: { estado: 'AVISADO_KARDEX' },
    });
  });

  it('flujo sin valorado: firma el Coordinador, Kardex remite y SEC_DIR recibe y entrega', async () => {
    const { nro } = await nuevaHoja('CERT_NOTAS_ANTERIOR');
    for (const [rol, accion] of [
      ['SEC_DIR', 'AVISAR_KARDEX'],
      ['KARDEX', 'RECOGER'],
      ['KARDEX', 'IMPRIMIR'],
      ['COORDINADOR', 'FIRMA_COORDINADOR'],
      ['KARDEX', 'REMITIR'],
      ['SEC_DIR', 'RECIBIR_CALAHUMANA'],
      ['SEC_DIR', 'ENTREGAR'],
    ] as [Rol, string][]) {
      expect((await paso(rol, nro, accion)).status, accion).toBe(200);
    }
    expect((await bd.hojaRuta.findUniqueOrThrow({ where: { nroTramite: nro } })).estadoActual).toBe('ENTREGADO');
  });

  it('el historial impreso anota el valorado; con observación se devuelve y se cierra (DEC-053)', async () => {
    const impreso = await nuevaHoja('HISTORIAL_ACADEMICO');
    await paso('SEC_DIR', impreso.nro, 'AVISAR_KARDEX');
    await paso('KARDEX', impreso.nro, 'RECOGER');
    expect((await paso('KARDEX', impreso.nro, 'IMPRIMIR', undefined, 'Notas conformes')).status).toBe(200);
    const ultimo = await bd.movimientoHojaRuta.findFirstOrThrow({
      where: { hojaRuta: { nroTramite: impreso.nro } },
      orderBy: { id: 'desc' },
    });
    expect(ultimo.observacion).toMatch(/^Impreso en el valorado N\.º V-\d+\. Notas conformes$/);

    // Se devuelve aunque el file se haya bloqueado mientras esperaba la impresión.
    const { nro, fileId } = await nuevaHoja('HISTORIAL_ACADEMICO');
    await paso('SEC_DIR', nro, 'AVISAR_KARDEX');
    await paso('KARDEX', nro, 'RECOGER');
    await bd.fileAcademico.update({ where: { id: fileId }, data: { bloqueado: true, motivoBloqueo: 'Licencia' } });
    const sin = await paso('KARDEX', nro, 'DEVOLVER');
    expect(sin.status).toBe(400);
    expect(sin.body.error.code).toBe('VALIDACION');
    const r = await paso('KARDEX', nro, 'DEVOLVER', undefined, 'La nota de 2.º año no coincide con el empaste');
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.estado).toBe('DEVUELTO');
    expect(r.body.acciones).toEqual([]);
    const h = await bd.hojaRuta.findUniqueOrThrow({ where: { nroTramite: nro } });
    expect(h.fechaCierre).not.toBeNull();
    expect((await paso('KARDEX', nro, 'IMPRIMIR')).status).toBe(409);
    const cert = await nuevaHoja('CERT_NOTAS_ANTERIOR');
    await paso('SEC_DIR', cert.nro, 'AVISAR_KARDEX');
    await paso('KARDEX', cert.nro, 'RECOGER');
    expect((await paso('KARDEX', cert.nro, 'DEVOLVER', undefined, 'x')).status).toBe(409);
  });

  it('paso de otro flujo o de otro estado: 409 y nada cambia', async () => {
    const { nro } = await nuevaHoja('CERT_NOTAS_ANTERIOR');
    const r = await paso('SEC_DIR', nro, 'ENTREGAR');
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('TRANSICION_INVALIDA');
    await paso('SEC_DIR', nro, 'AVISAR_KARDEX');
    await paso('KARDEX', nro, 'RECOGER');
    await paso('KARDEX', nro, 'IMPRIMIR');
    expect((await paso('SEC_DIR', nro, 'FIRMA_DIR_ACADEMICA')).body.error.code).toBe('TRANSICION_INVALIDA');
    expect(await bd.movimientoHojaRuta.count({ where: { hojaRuta: { nroTramite: nro } } })).toBe(4);
  });

  it('otro rol u otra sede: 403', async () => {
    const { nro } = await nuevaHoja('HISTORIAL_ACADEMICO');
    expect((await paso('KARDEX', nro, 'AVISAR_KARDEX')).status).toBe(403);
    expect((await paso('SEC_DIR', nro, 'AVISAR_KARDEX', sedes.ANCOCAGUA)).status).toBe(403);
  });

  it('file bloqueado: no avanza hasta imprimir (422); el detalle muestra la acción deshabilitada', async () => {
    const { nro } = await nuevaHoja('HISTORIAL_ACADEMICO', true);
    const r = await paso('SEC_DIR', nro, 'AVISAR_KARDEX');
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('FILE_BLOQUEADO');
    const d = await request(app)
      .get(`/api/v1/hojas-ruta/${nro}`)
      .set('Authorization', `Bearer ${await token('SEC_DIR')}`);
    expect(d.body.acciones).toEqual([
      { accion: 'AVISAR_KARDEX', etiqueta: 'Avisar a Kardex', deshabilitada: 'El file del titular está bloqueado.' },
    ]);
  });

  it('dos pasos simultáneos sobre la misma hoja: uno gana y el otro 409 (FOR UPDATE)', async () => {
    const { nro } = await nuevaHoja('HISTORIAL_ACADEMICO');
    const estados = (await Promise.all([paso('SEC_DIR', nro, 'AVISAR_KARDEX'), paso('SEC_DIR', nro, 'AVISAR_KARDEX')]))
      .map((r) => r.status)
      .sort();
    expect(estados).toEqual([200, 409]);
    expect(await bd.movimientoHojaRuta.count({ where: { hojaRuta: { nroTramite: nro } } })).toBe(2);
  });

  it('GET: movimientos con quién y dónde, titular y las acciones de quien pregunta', async () => {
    const { nro } = await nuevaHoja('CERT_NOTAS_ANTERIOR');
    await paso('SEC_DIR', nro, 'AVISAR_KARDEX');
    const get = async (rol: Rol) =>
      (
        await request(app)
          .get(`/api/v1/hojas-ruta/${nro.toLowerCase()}`)
          .set('Authorization', `Bearer ${await token(rol)}`)
      ).body;
    const k = await get('KARDEX');
    expect(k).toMatchObject({
      nro,
      estado: 'AVISADO_KARDEX',
      tipo: { codigo: 'CERT_NOTAS_ANTERIOR', requiereValorado: false },
      titular: { nombre: 'Egresada Tramite', bloqueado: false },
      sedeActual: { codigo: 'LA_PAZ' },
    });
    expect(k.movimientos.map((m: { accion: string; sede: string }) => [m.accion, m.sede])).toEqual([
      ['REGISTRAR', 'LA_PAZ'],
      ['AVISAR_KARDEX', 'LA_PAZ'],
    ]);
    expect(k.movimientos[1].usuario).toEqual({ id: personal.SEC_DIR.id, nombre: 'SEC_DIR Trámites' });
    expect(k.acciones.map((a: { accion: string }) => a.accion)).toEqual(['RECOGER']);
    expect((await get('SEC_DIR')).acciones).toEqual([]);
    const no = await request(app)
      .get('/api/v1/hojas-ruta/HR-2026-999999')
      .set('Authorization', `Bearer ${await token('SEC_DIR')}`);
    expect(no.status).toBe(404);
  });

  it('movimiento_hoja_ruta es de solo inserción; el trigger copia estado y sede a la hoja', async () => {
    const { nro } = await nuevaHoja('HISTORIAL_ACADEMICO');
    await paso('SEC_DIR', nro, 'AVISAR_KARDEX');
    await paso('KARDEX', nro, 'RECOGER');
    const h = await bd.hojaRuta.findUniqueOrThrow({ where: { nroTramite: nro } });
    expect(h).toMatchObject({ estadoActual: 'EN_IMPRESION', sedeActualId: sedes.ANCOCAGUA });
    await expect(
      bd.$executeRaw`UPDATE "movimiento_hoja_ruta" SET "observacion" = 'x' WHERE "hoja_ruta_id" = ${h.id}`,
    ).rejects.toThrow(/solo inserción/);
    await expect(bd.$executeRaw`DELETE FROM "movimiento_hoja_ruta" WHERE "hoja_ruta_id" = ${h.id}`).rejects.toThrow(
      /solo inserción/,
    );
  });

  it('los 4 tipos de trámite de D-21 están sembrados', async () => {
    const tipos = await bd.tipoTramite.findMany({ orderBy: { id: 'asc' } });
    expect(tipos.map((t) => [t.codigo, t.requiereValorado])).toEqual([
      ['HISTORIAL_ACADEMICO', true],
      ['LEGALIZACION_HISTORIAL', true],
      ['CERT_NOTAS_ANTERIOR', false],
      ['CERT_EXCELENCIA_ANTERIOR', false],
    ]);
  });
});
