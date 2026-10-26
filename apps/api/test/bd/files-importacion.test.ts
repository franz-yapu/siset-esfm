import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { hashPassword } from '@/modulos/seguridad';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA, PASSWORD_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

// DEC-064 #3–#5: la cuenta del estudiante nace con su file (CI + fecha de nacimiento dd-mm-aaaa, a cambiar), se
// desactiva al egresar y vuelve si regresa a estudiante; y la importación desde el Excel.

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });
let siguienteCi = 6690100;
let siguienteCodigo = 1;
const nuevoCi = () => String(siguienteCi++);
const nuevoCodigo = () => `IMP-${String(siguienteCodigo++).padStart(4, '0')}`;
let kardexId = 0;
let matematica = 0;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
  const sede = await bd.sede.findUniqueOrThrow({ where: { codigo: 'ANCOCAGUA' } });
  const ci = nuevoCi();
  const persona = await bd.persona.create({ data: { ci, nombres: 'Kardex', apellidoPaterno: 'Importa' } });
  kardexId = (
    await bd.usuario.create({
      data: {
        personaId: persona.id,
        rolId: rol.id,
        sedeId: sede.id,
        username: ci,
        passwordHash: await hashPassword(PASSWORD_DE_PRUEBA),
        debeCambiarPassword: false,
      },
    })
  ).id;
  matematica = (await bd.especialidad.findFirstOrThrow({ where: { activo: true } })).id;
});
afterAll(() => bd.$disconnect());

const como = async (metodo: 'post' | 'patch', ruta: string, cuerpo: object) => {
  const { token } = await firmarAccessToken(
    { usuarioId: kardexId, rol: 'KARDEX', sedeId: null, debeCambiarPassword: false },
    SECRETO_JWT_DE_PRUEBA,
    new Date(),
  );
  return request(app)[metodo](`/api/v1${ruta}`).set('Authorization', `Bearer ${token}`).send(cuerpo);
};

const fila = (extra: object = {}) => ({
  ci: nuevoCi(),
  nombres: 'Rosa',
  apellidoPaterno: 'Quispe',
  apellidoMaterno: 'Mamani',
  fechaNacimiento: '2004-03-15',
  codigo: nuevoCodigo(),
  especialidadId: matematica,
  anioIngreso: 2024,
  condicion: 'ESTUDIANTE',
  modalidad: 'A',
  ...extra,
});

const login = (usuario: string, password: string) =>
  request(app).post('/api/v1/auth/login').send({ usuario, password });

const cuenta = (ci: string) =>
  bd.usuario.findUnique({ where: { username: ci }, select: { activo: true, debeCambiarPassword: true, sedeId: true } });

describe('cuenta del estudiante con su file (DEC-064 #4, #5)', () => {
  it('el alta crea la cuenta: usuario CI, contraseña dd-mm-aaaa, cambio obligatorio, sin sede; sin la clave en la bitácora', async () => {
    const d = fila();
    const r = await como('post', '/files', d);
    expect(r.status).toBe(201);
    expect(r.body.cuentaEstudiante).toBe('CREADA');
    expect(await cuenta(d.ci)).toEqual({ activo: true, debeCambiarPassword: true, sedeId: null });
    const s = await login(d.ci, '15-03-2004');
    expect(s.status).toBe(200);
    expect(s.body.usuario).toMatchObject({ rol: 'ESTUDIANTE', debeCambiarPassword: true });
    const evento = await bd.logAuditoria.findFirstOrThrow({
      where: { accion: 'CREAR', entidad: 'usuario' },
      orderBy: { id: 'desc' },
    });
    expect(JSON.stringify(evento.datosDespues)).not.toMatch(/15-03-2004|\$2[aby]\$/);
    expect(evento.datosDespues).toMatchObject({ usuario: d.ci, inicial: 'FECHA_NACIMIENTO' });
  });

  it('un estudiante sin fecha de nacimiento no se registra; un egresado sí, y sin cuenta', async () => {
    const sin = await como('post', '/files', fila({ fechaNacimiento: null }));
    expect(sin.status).toBe(400);
    expect(sin.body.error.details[0]).toMatchObject({ ruta: 'body.fechaNacimiento' });
    const egresado = fila({ condicion: 'EGRESADO', fechaNacimiento: null, modalidad: null });
    const r = await como('post', '/files', egresado);
    expect(r.status).toBe(201);
    expect(r.body.cuentaEstudiante).toBeNull();
    expect(await cuenta(egresado.ci)).toBeNull();
  });

  it('al egresar se desactiva la cuenta; si vuelve a estudiante, se reactiva con la misma contraseña', async () => {
    const d = fila();
    const { id } = (await como('post', '/files', d)).body as { id: number };
    expect((await como('patch', `/files/${id}`, { condicion: 'EGRESADO' })).status).toBe(200);
    expect((await cuenta(d.ci))?.activo).toBe(false);
    expect((await login(d.ci, '15-03-2004')).status).toBe(401);
    expect((await como('patch', `/files/${id}`, { condicion: 'ESTUDIANTE' })).status).toBe(200);
    expect((await cuenta(d.ci))?.activo).toBe(true);
    expect((await login(d.ci, '15-03-2004')).status).toBe(200);
  });

  it('si el CI ya es usuario de otra cuenta, el file se crea igual y lo informa', async () => {
    const d = fila();
    const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'COORDINADOR' } });
    const otra = await bd.persona.create({ data: { ci: `${d.ci}9`, nombres: 'Otra', apellidoPaterno: 'Persona' } });
    await bd.usuario.create({
      data: { personaId: otra.id, rolId: rol.id, username: d.ci, passwordHash: 'x', debeCambiarPassword: true },
    });
    const r = await como('post', '/files', d);
    expect(r.status).toBe(201);
    expect(r.body.cuentaEstudiante).toBe('USUARIO_OCUPADO');
  });
});

describe('POST /files/importacion (DEC-064 #3)', () => {
  it('revisa sin escribir: crear, actualizar, sin cambios y errores fila por fila', async () => {
    const existente = fila();
    const otroExistente = fila();
    expect((await como('post', '/files', existente)).status).toBe(201);
    expect((await como('post', '/files', otroExistente)).status).toBe(201);
    const nuevo = fila();
    const filas = [
      nuevo,
      { ...existente, celular: '71234567' },
      otroExistente,
      fila({ especialidadId: 999_999 }),
      fila({ fechaNacimiento: null }),
      { ...nuevo, codigo: nuevoCodigo() },
      fila({ codigo: existente.codigo }),
    ];
    const r = await como('post', '/files/importacion', { filas });
    expect(r.status).toBe(200);
    expect(r.body.aplicado).toBe(false);
    expect(r.body.resumen).toEqual({ crear: 1, actualizar: 1, sinCambios: 1, errores: 4 });
    const por = (n: number) => r.body.filas[n - 1];
    expect(por(1)).toMatchObject({ accion: 'CREAR', ci: nuevo.ci, nombre: 'Rosa Quispe Mamani' });
    expect(por(2)).toMatchObject({ accion: 'ACTUALIZAR', cambios: ['celular'] });
    expect(por(3).accion).toBe('SIN_CAMBIOS');
    expect(por(4).errores[0].campo).toBe('especialidadId');
    expect(por(5).errores[0].campo).toBe('fechaNacimiento');
    expect(por(6).errores[0]).toEqual({ campo: 'ci', mensaje: 'El CI se repite en la fila 1' });
    expect(por(7).errores[0].campo).toBe('codigo');
    expect(await bd.persona.findFirst({ where: { ci: nuevo.ci } })).toBeNull();
  });

  it('con errores no aplica nada aunque lo pidan', async () => {
    const buena = fila();
    const r = await como('post', '/files/importacion', { aplicar: true, filas: [buena, fila({ nombres: '' })] });
    expect(r.body).toMatchObject({ aplicado: false, resumen: { errores: 1 } });
    expect(await bd.persona.findFirst({ where: { ci: buena.ci } })).toBeNull();
  });

  it('aplica todo junto: crea, actualiza, cuentas de estudiantes y egresado sin cuenta, con su bitácora', async () => {
    const yaEstaba = fila();
    expect((await como('post', '/files', yaEstaba)).status).toBe(201);
    const nuevo = fila({ fechaNacimiento: '2003-12-01' });
    const egresa = { ...yaEstaba, condicion: 'EGRESADO' };
    const egresadoNuevo = fila({ condicion: 'EGRESADO', fechaNacimiento: null, modalidad: null });
    const r = await como('post', '/files/importacion', { aplicar: true, filas: [nuevo, egresa, egresadoNuevo] });
    expect(r.status).toBe(200);
    expect(r.body.aplicado).toBe(true);
    expect(r.body.filas.map((f: { accion: string; cuenta: string | null }) => [f.accion, f.cuenta])).toEqual([
      ['CREAR', 'CREADA'],
      ['ACTUALIZAR', 'DESACTIVADA'],
      ['CREAR', null],
    ]);
    expect((await login(nuevo.ci, '01-12-2003')).status).toBe(200);
    expect((await cuenta(yaEstaba.ci))?.activo).toBe(false);
    expect(await cuenta(egresadoNuevo.ci)).toBeNull();
    const file = await bd.fileAcademico.findFirstOrThrow({ where: { codigoEstudiante: nuevo.codigo } });
    expect(
      await bd.logAuditoria.count({
        where: { entidad: 'file_academico', entidadId: String(file.id), accion: 'CREAR' },
      }),
    ).toBe(1);

    // Volver a importar lo mismo no cambia nada y deja las cuentas como estaban.
    const otra = await como('post', '/files/importacion', { aplicar: true, filas: [nuevo] });
    expect(otra.body.filas[0]).toMatchObject({ accion: 'SIN_CAMBIOS', cuenta: 'EXISTENTE' });
  });

  it('valida el cuerpo: sin filas o con más de 2000, 400', async () => {
    expect((await como('post', '/files/importacion', { filas: [] })).status).toBe(400);
    expect((await como('post', '/files/importacion', { filas: Array(2001).fill({}) })).status).toBe(400);
  });
});
