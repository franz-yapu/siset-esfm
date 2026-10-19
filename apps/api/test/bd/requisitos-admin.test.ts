import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { codigoDesdeNombre } from '@/modulos/catalogos/requisitos-admin.servicio';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { REQUISITOS, sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
let kardexId = 0;

const como = async (metodo: 'get' | 'post' | 'patch', ruta: string, cuerpo?: object, rol = 'KARDEX') => {
  const { token } = await firmarAccessToken(
    { usuarioId: kardexId, rol, sedeId: null, debeCambiarPassword: false },
    SECRETO_JWT_DE_PRUEBA,
    new Date(),
  );
  const r = request(app)[metodo](`/api/v1${ruta}`).set('Authorization', `Bearer ${token}`);
  return cuerpo ? r.send(cuerpo) : r;
};

const eventos = (id: number) =>
  bd.logAuditoria.findMany({ where: { entidad: 'requisito_tipo', entidadId: String(id) }, orderBy: { id: 'asc' } });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  kardexId = (await bd.usuario.findFirstOrThrow({ where: { rol: { codigo: 'KARDEX' } } })).id;
});
// Los requisitos creados aquí se borran: otros archivos cuentan el catálogo y calculan semáforos con él.
afterAll(async () => {
  await bd.requisitoTipo.deleteMany({ where: { codigo: { notIn: REQUISITOS.map((r) => r.codigo) } } });
  await bd.$disconnect();
});

describe('catálogo de requisitos por modalidad (DEC-055)', () => {
  it('Kardex agrega un requisito solo para B2: código desde el nombre, al final del orden, con evento CREAR', async () => {
    const r = await como('post', '/catalogos/requisitos', {
      nombre: 'Certificado de práctica docente',
      modalidades: ['B2'],
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      codigo: 'CERTIFICADO_DE_PRACTICA_DO',
      modalidades: ['B2'],
      obligatorio: true,
      activo: true,
      porGestion: false,
    });
    const maximo = (await bd.requisitoTipo.aggregate({ _max: { orden: true } }))._max.orden;
    expect(r.body.orden).toBe(maximo);
    expect((await bd.requisitoTipo.findUniqueOrThrow({ where: { id: r.body.id } })).soloModalidad).toBe('B2');
    const [evento] = await eventos(r.body.id);
    expect(evento).toMatchObject({ accion: 'CREAR', modulo: 'CATALOGOS', usuarioId: kardexId });

    // El mismo nombre otra vez: otro código, con sufijo.
    const otro = await como('post', '/catalogos/requisitos', { nombre: 'Certificado de práctica docente' });
    expect(otro.body.codigo).toBe('CERTIFICADO_DE_PRACTICA_DO_2');
    expect(otro.body.modalidades).toEqual([]);
  });

  it('editar las modalidades: todas se guardan como "todas" (null); solo registra lo que cambió', async () => {
    const { body: creado } = await como('post', '/catalogos/requisitos', { nombre: 'Requisito para editar' });
    const r = await como('patch', `/catalogos/requisitos/${creado.id}`, {
      modalidades: ['B3', 'A'],
      nombre: creado.nombre,
    });
    expect(r.status).toBe(200);
    expect(r.body.modalidades).toEqual(['A', 'B3']);
    const ev = (await eventos(creado.id)).at(-1)!;
    expect(ev).toMatchObject({
      accion: 'EDITAR',
      datosAntes: { modalidades: [] },
      datosDespues: { modalidades: ['A', 'B3'] },
    });

    const todas = await como('patch', `/catalogos/requisitos/${creado.id}`, { modalidades: ['A', 'B1', 'B2', 'B3'] });
    expect(todas.body.modalidades).toEqual([]);
    expect((await bd.requisitoTipo.findUniqueOrThrow({ where: { id: creado.id } })).soloModalidad).toBeNull();

    const n = (await eventos(creado.id)).length;
    expect((await como('patch', `/catalogos/requisitos/${creado.id}`, { modalidades: [] })).status).toBe(200);
    expect(await eventos(creado.id)).toHaveLength(n);
  });

  it('dar de baja y reactivar: deja de salir en el catálogo activo; 422 si no cambia', async () => {
    const { body: creado } = await como('post', '/catalogos/requisitos', { nombre: 'Requisito para dar de baja' });
    const baja = await como('post', `/catalogos/requisitos/${creado.id}/baja`);
    expect(baja.status).toBe(200);
    expect(baja.body.activo).toBe(false);
    const activos = (await como('get', '/catalogos/requisitos')).body as { id: number }[];
    expect(activos.map((x) => x.id)).not.toContain(creado.id);
    const todos = (await como('get', '/catalogos/requisitos/todos')).body as { id: number; activo: boolean }[];
    expect(todos.find((x) => x.id === creado.id)?.activo).toBe(false);
    expect((await como('post', `/catalogos/requisitos/${creado.id}/baja`)).body.error.code).toBe('ESTADO_SIN_CAMBIO');
    expect((await como('post', `/catalogos/requisitos/${creado.id}/reactivar`)).body.activo).toBe(true);
    expect((await eventos(creado.id)).map((e) => e.accion)).toEqual(['CREAR', 'DAR_DE_BAJA', 'REACTIVAR']);
  });

  it('validaciones: modalidad desconocida, "por gestión" no se edita, nombre corto; 404 si no existe', async () => {
    expect((await como('post', '/catalogos/requisitos', { nombre: 'Algo', modalidades: ['C'] })).status).toBe(400);
    expect((await como('post', '/catalogos/requisitos', { nombre: 'X' })).status).toBe(400);
    expect(
      (await como('post', '/catalogos/requisitos', { nombre: 'Algo más', soloAniosTerminados: true })).status,
    ).toBe(400);
    const { body: creado } = await como('post', '/catalogos/requisitos', { nombre: 'Requisito sin gestión' });
    expect((await como('patch', `/catalogos/requisitos/${creado.id}`, { porGestion: true })).status).toBe(400);
    expect((await como('patch', '/catalogos/requisitos/999999', { nombre: 'Nuevo nombre' })).status).toBe(404);
  });

  it('el requisito nuevo aparece en los files de su modalidad', async () => {
    const { body: creado } = await como('post', '/catalogos/requisitos', {
      nombre: 'Solo para A en files',
      modalidades: ['A'],
    });
    const activos = (await como('get', '/catalogos/requisitos')).body as { codigo: string; soloModalidad: string }[];
    expect(activos.find((x) => x.codigo === creado.codigo)?.soloModalidad).toBe('A');
    await como('post', `/catalogos/requisitos/${creado.id}/baja`);
  });
});

describe('codigoDesdeNombre', () => {
  it('mayúsculas sin tildes, máximo 26 + sufijo', () => {
    expect(codigoDesdeNombre('Título de bachiller ñandú', [])).toBe('TITULO_DE_BACHILLER_NANDU');
    expect(codigoDesdeNombre('¡¡!!', [])).toBe('REQUISITO');
    expect(codigoDesdeNombre('Matrícula', ['MATRICULA', 'MATRICULA_2'])).toBe('MATRICULA_3');
  });
});
