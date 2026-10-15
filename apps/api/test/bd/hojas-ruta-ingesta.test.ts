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
let siguiente = 7100100;
let secDir = 0;
let laPaz = 0;
let ancocagua = 0;
let especialidadId = 0;
const GESTION = new Date(Date.now() - 4 * 60 * 60_000).getUTCFullYear();

const token = async (rol = 'SEC_DIR', sedeId = laPaz) =>
  (
    await firmarAccessToken(
      { usuarioId: secDir, rol, sedeId, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;

const ingresar = async (cuerpo: object, rol?: string, sedeId?: number) =>
  request(app)
    .post('/api/v1/hojas-ruta')
    .set('Authorization', `Bearer ${await token(rol, sedeId)}`)
    .send(cuerpo);

async function nuevoFile(extra: { condicion?: 'ESTUDIANTE' | 'EGRESADO'; bloqueado?: boolean; nombres?: string } = {}) {
  const n = siguiente++;
  const persona = await bd.persona.create({
    data: { ci: String(n), nombres: extra.nombres ?? 'Egresado', apellidoPaterno: 'Ingesta' },
  });
  const f = await bd.fileAcademico.create({
    data: {
      personaId: persona.id,
      codigoEstudiante: `ING-${n}`,
      especialidadId,
      anioIngreso: 2018,
      condicion: extra.condicion ?? 'EGRESADO',
      bloqueado: extra.bloqueado ?? false,
      motivoBloqueo: extra.bloqueado ? 'Permiso obligatorio' : null,
    },
  });
  return { fileId: f.id, ci: String(n) };
}

const ultimoNro = async () => (await bd.hojaRutaCorrelativo.findUnique({ where: { gestion: GESTION } }))?.ultimo ?? 0;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  laPaz = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'LA_PAZ' } })).id;
  ancocagua = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'ANCOCAGUA' } })).id;
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'SEC_DIR' } });
  const persona = await bd.persona.create({
    data: { ci: '7100001', nombres: 'Secretaria', apellidoPaterno: 'Dirección' },
  });
  secDir = (
    await bd.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        sedeId: laPaz,
        username: '7100001',
        passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
        debeCambiarPassword: false,
      },
    })
  ).id;
  especialidadId = (await bd.especialidad.findFirstOrThrow()).id;
});
afterAll(() => bd.$disconnect());

describe('ingesta de hojas de ruta (SDD S3.2-S3.4 §2.2, RF-08)', () => {
  it('historial con valorado: 201, N.º HR-AAAA-NNNNNN, RECIBIDO, movimiento REGISTRAR y evento CREAR', async () => {
    const { fileId } = await nuevoFile();
    const antes = await ultimoNro();
    const r = await ingresar({
      fileId,
      tipoTramite: 'historial_academico',
      nroValorado: ' 004522 ',
      observacion: 'Con fotocopia de CI',
    });
    expect(r.status).toBe(201);
    expect(r.body.nro).toBe(`HR-${GESTION}-${String(antes + 1).padStart(6, '0')}`);
    expect(r.body).toMatchObject({
      estado: 'RECIBIDO',
      gestion: GESTION,
      nroValorado: '004522',
      tipo: { codigo: 'HISTORIAL_ACADEMICO', requiereValorado: true },
      sedeActual: { codigo: 'LA_PAZ' },
      titular: { fileId, nombre: 'Egresado Ingesta' },
    });
    expect(r.body.movimientos).toMatchObject([
      { accion: 'REGISTRAR', estadoAnterior: null, estadoNuevo: 'RECIBIDO', observacion: 'Con fotocopia de CI' },
    ]);
    expect(r.body.acciones.map((a: { accion: string }) => a.accion)).toEqual(['AVISAR_KARDEX']);
    const evento = await bd.logAuditoria.findFirstOrThrow({
      where: { entidad: 'hoja_ruta', entidadId: r.body.nro, accion: 'CREAR' },
    });
    expect(evento).toMatchObject({
      usuarioId: secDir,
      modulo: 'HOJAS_RUTA',
      datosDespues: { tipo: 'HISTORIAL_ACADEMICO', fileId },
    });
  });

  it('certificado sin valorado: 201; con valorado → 400; historial sin valorado → 400', async () => {
    const { fileId } = await nuevoFile();
    expect((await ingresar({ fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR' })).status).toBe(201);
    const con = await ingresar({ fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR', nroValorado: '1' });
    expect(con.status).toBe(400);
    expect(JSON.stringify(con.body.error.details)).toContain('no lleva valorado');
    const sin = await ingresar({ fileId, tipoTramite: 'LEGALIZACION_HISTORIAL' });
    expect(sin.status).toBe(400);
    expect(JSON.stringify(sin.body.error.details)).toContain('necesita el N.º de valorado');
  });

  it.each([
    ['file inexistente', async () => ({ fileId: 999_999 }), 'FILE_INEXISTENTE'],
    ['file de un estudiante (D-09)', async () => nuevoFile({ condicion: 'ESTUDIANTE' }), 'FILE_NO_EGRESADO'],
    ['file bloqueado', async () => nuevoFile({ bloqueado: true }), 'FILE_BLOQUEADO'],
  ])('%s: 422 sin consumir número', async (_caso, file, codigo) => {
    const { fileId } = await file();
    const antes = await ultimoNro();
    const r = await ingresar({ fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR' });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe(codigo);
    expect(await ultimoNro()).toBe(antes);
  });

  it('tipo inexistente: 422; SEC_DIR desde Ancocagua: 403', async () => {
    const { fileId } = await nuevoFile();
    expect((await ingresar({ fileId, tipoTramite: 'TITULACION' })).body.error.code).toBe('TIPO_TRAMITE_INEXISTENTE');
    expect((await ingresar({ fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR' }, 'SEC_DIR', ancocagua)).status).toBe(403);
  });

  it('20 ingestas simultáneas: números consecutivos, sin huecos ni repetidos (ADR-0006)', async () => {
    const { fileId } = await nuevoFile();
    const antes = await ultimoNro();
    const rs = await Promise.all(
      Array.from({ length: 20 }, () => ingresar({ fileId, tipoTramite: 'CERT_EXCELENCIA_ANTERIOR' })),
    );
    expect(rs.map((r) => r.status)).toEqual(Array(20).fill(201));
    const numeros = rs.map((r) => Number((r.body.nro as string).slice(-6))).sort((a, b) => a - b);
    expect(numeros).toEqual(Array.from({ length: 20 }, (_, i) => antes + 1 + i));
  });

  it('un rollback libera el número: la siguiente ingesta lo recibe', async () => {
    const antes = await ultimoNro();
    await expect(
      bd.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT fn_siguiente_nro_hoja_ruta(${GESTION}::smallint)`;
        throw new Error('falla a propósito');
      }),
    ).rejects.toThrow('falla a propósito');
    const { fileId } = await nuevoFile();
    const r = await ingresar({ fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR' });
    expect(r.body.nro).toBe(`HR-${GESTION}-${String(antes + 1).padStart(6, '0')}`);
  });

  it('cada gestión empieza en 000001', async () => {
    const [{ nro }] = await bd.$queryRaw<{ nro: string }[]>`SELECT fn_siguiente_nro_hoja_ruta(1999::smallint) AS nro`;
    expect(nro).toBe('HR-1999-000001');
  });
});

describe('GET /hojas-ruta (SDD S3.2-S3.4 §2.3)', () => {
  it('filtra por N.º, CI y nombre del titular, estado y tipo; más recientes primero', async () => {
    const a = await nuevoFile({ nombres: 'Zacarías' });
    const b = await nuevoFile({ nombres: 'Zacarías' });
    const ha = (await ingresar({ fileId: a.fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR' })).body.nro as string;
    const hb = (await ingresar({ fileId: b.fileId, tipoTramite: 'HISTORIAL_ACADEMICO', nroValorado: '77' })).body
      .nro as string;
    const listar = async (q: Record<string, string>) =>
      (
        await request(app)
          .get('/api/v1/hojas-ruta')
          .query(q)
          .set('Authorization', `Bearer ${await token()}`)
      ).body;

    const porNombre = await listar({ texto: 'zacarías' });
    expect(porNombre.datos.map((h: { nro: string }) => h.nro)).toEqual([hb, ha]);
    expect(porNombre.datos[0]).toMatchObject({
      tipo: { codigo: 'HISTORIAL_ACADEMICO' },
      estado: 'RECIBIDO',
      sedeActual: 'LA_PAZ',
      titular: { ci: b.ci },
    });
    expect((await listar({ texto: a.ci })).datos.map((h: { nro: string }) => h.nro)).toEqual([ha]);
    expect((await listar({ texto: hb.toLowerCase() })).datos.map((h: { nro: string }) => h.nro)).toEqual([hb]);
    expect(
      (await listar({ texto: 'zacarías', tipoTramite: 'cert_notas_anterior' })).datos.map(
        (h: { nro: string }) => h.nro,
      ),
    ).toEqual([ha]);
    expect((await listar({ texto: 'zacarías', estado: 'ENTREGADO' })).total).toBe(0);
    const pag = await listar({ texto: 'zacarías', porPagina: '1', pagina: '2' });
    expect(pag).toMatchObject({ total: 2, pagina: 2, porPagina: 1 });
    expect(pag.datos[0].nro).toBe(ha);
  });
});

describe('GET /hojas-ruta/tipos (SDD S3.8-S3.9 §2.2)', () => {
  it('los tipos activos con requiereValorado, ordenados por nombre; 401 sin token', async () => {
    const r = await request(app)
      .get('/api/v1/hojas-ruta/tipos')
      .set('Authorization', `Bearer ${await token('KARDEX', ancocagua)}`);
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThanOrEqual(4);
    expect(r.body).toContainEqual(expect.objectContaining({ codigo: 'HISTORIAL_ACADEMICO', requiereValorado: true }));
    expect(r.body).toContainEqual(expect.objectContaining({ codigo: 'CERT_NOTAS_ANTERIOR', requiereValorado: false }));
    const nombres = r.body.map((t: { nombre: string }) => t.nombre);
    expect(nombres).toEqual([...nombres].sort((a: string, b: string) => a.localeCompare(b, 'es')));
    expect((await request(app).get('/api/v1/hojas-ruta/tipos')).status).toBe(401);
  });
});

describe('POST /seguimiento (RF-09, S4.1)', () => {
  it('con N.º y CI del titular: nombre y pasos, sin quién los hizo; si falla uno de los dos, el mismo 404', async () => {
    const f = await nuevoFile({ nombres: 'Seguida' });
    const nro = (await ingresar({ fileId: f.fileId, tipoTramite: 'CERT_NOTAS_ANTERIOR' })).body.nro as string;
    const consultar = (cuerpo: object) => request(app).post('/api/v1/seguimiento').send(cuerpo);

    const r = await consultar({ nro: nro.toLowerCase(), ci: f.ci });
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ nro, estado: 'RECIBIDO', titular: 'Seguida Ingesta' });
    expect(r.body.pasos).toHaveLength(1);
    expect(Object.keys(r.body).sort()).toEqual(
      ['estado', 'fechaCierre', 'fechaIngreso', 'nro', 'pasos', 'sedeActual', 'tipo', 'titular'].sort(),
    );
    expect(Object.keys(r.body.pasos[0]).sort()).toEqual(['estado', 'fecha', 'sede']);

    const otroCi = await consultar({ nro, ci: '1234567' });
    const otroNro = await consultar({ nro: 'HR-2099-999999', ci: f.ci });
    expect(otroCi.status).toBe(404);
    expect(otroNro.status).toBe(404);
    expect(otroCi.body.error.message).toBe(otroNro.body.error.message);
    expect((await consultar({ nro, ci: '1' })).status).toBe(400);
  });
});
