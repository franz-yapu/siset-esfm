import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { REQUISITOS, sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
let kardexId = 0;
let especialidadId = 0;
let siguiente = 6750100;

const como = async (metodo: 'get' | 'post' | 'patch', ruta: string, cuerpo?: object, rol = 'KARDEX') => {
  const { token } = await firmarAccessToken(
    { usuarioId: kardexId, rol, sedeId: null, debeCambiarPassword: false },
    SECRETO_JWT_DE_PRUEBA,
    new Date(),
  );
  const r = request(app)[metodo](`/api/v1${ruta}`).set('Authorization', `Bearer ${token}`);
  return cuerpo ? r.send(cuerpo) : r;
};

const nuevoFile = (modalidad: string) => {
  const n = String(siguiente++);
  return como('post', '/files', {
    ci: n,
    complemento: '',
    nombres: 'Prueba',
    apellidoPaterno: 'Modalidad',
    apellidoMaterno: null,
    fechaNacimiento: '2004-05-10',
    celular: null,
    email: null,
    codigo: `MOD-${n}`,
    especialidadId,
    anioIngreso: 2024,
    condicion: 'ESTUDIANTE',
    modalidad,
  });
};

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  kardexId = (await bd.usuario.findFirstOrThrow({ where: { rol: { codigo: 'KARDEX' } } })).id;
  especialidadId = (await bd.especialidad.findFirstOrThrow()).id;
});
// Lo creado aquí se deja de baja: otros archivos cuentan las modalidades activas y el catálogo de requisitos.
afterAll(async () => {
  await bd.requisitoTipo.deleteMany({ where: { codigo: { notIn: REQUISITOS.map((r) => r.codigo) } } });
  await bd.modalidadIngreso.updateMany({
    where: { codigo: { notIn: ['A', 'B1', 'B2', 'B3'] } },
    data: { activo: false },
  });
  await bd.$disconnect();
});

describe('catálogo de modalidades de ingreso (DEC-058)', () => {
  it('arranca con A, B1, B2 y B3; quien lee files las ve', async () => {
    const r = await como('get', '/catalogos/modalidades', undefined, 'SEC_COORD');
    expect(r.status).toBe(200);
    expect((r.body as { codigo: string }[]).map((m) => m.codigo).slice(0, 4)).toEqual(['A', 'B1', 'B2', 'B3']);
  });

  it('Kardex agrega una modalidad: código en mayúsculas, al final, con evento CREAR; el código no se repite', async () => {
    const r = await como('post', '/catalogos/modalidades', { codigo: 'b4', nombre: 'Modalidad B4' });
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    expect(r.body).toMatchObject({ codigo: 'B4', nombre: 'Modalidad B4', activo: true, requisitos: 0 });
    const eventos = await bd.logAuditoria.findMany({
      where: { entidad: 'modalidad_ingreso', entidadId: String(r.body.id) },
    });
    expect(eventos.map((e) => e.accion)).toEqual(['CREAR']);
    const repetida = await como('post', '/catalogos/modalidades', { codigo: 'B4', nombre: 'Otra' });
    expect(repetida.status).toBe(409);
    expect(repetida.body.error.code).toBe('MODALIDAD_EXISTENTE');
    expect((await como('post', '/catalogos/modalidades', { codigo: 'B 4', nombre: 'Mal' })).status).toBe(400);
  });

  it('un file puede tener la modalidad nueva; un requisito se le puede pedir solo a ella', async () => {
    expect((await nuevoFile('B4')).status).toBe(201);
    const req = await como('post', '/catalogos/requisitos', { nombre: 'Requisito solo B4', modalidades: ['B4'] });
    expect(req.status).toBe(201);
    expect(req.body.modalidades).toEqual(['B4']);
    const todas = (await como('get', '/catalogos/modalidades/todas')).body as { codigo: string; requisitos: number }[];
    expect(todas.find((m) => m.codigo === 'B4')?.requisitos).toBe(1);
  });

  it('editar nombre y descripción registra solo lo que cambió; el código no se edita', async () => {
    const { body: m } = await como('post', '/catalogos/modalidades', { codigo: 'C7', nombre: 'Modalidad C7' });
    const r = await como('patch', `/catalogos/modalidades/${m.id}`, { nombre: 'Convenio', descripcion: 'Prueba' });
    expect(r.body).toMatchObject({ codigo: 'C7', nombre: 'Convenio', descripcion: 'Prueba' });
    const ev = await bd.logAuditoria.findFirstOrThrow({
      where: { entidad: 'modalidad_ingreso', entidadId: String(m.id), accion: 'EDITAR' },
    });
    expect(ev).toMatchObject({ datosAntes: { nombre: 'Modalidad C7', descripcion: null } });
    expect((await como('patch', `/catalogos/modalidades/${m.id}`, { codigo: 'C8' })).status).toBe(400);
  });

  it('dada de baja: no se ofrece ni se acepta en un file nuevo; el file que la tenía la conserva; se reactiva', async () => {
    const { body: m } = await como('post', '/catalogos/modalidades', { codigo: 'D1', nombre: 'Modalidad D1' });
    const conD1 = await nuevoFile('D1');
    expect(conD1.status).toBe(201);
    const baja = await como('post', `/catalogos/modalidades/${m.id}/baja`);
    expect(baja.body.activo).toBe(false);
    const activas = (await como('get', '/catalogos/modalidades')).body as { codigo: string }[];
    expect(activas.map((x) => x.codigo)).not.toContain('D1');
    const rechazado = await nuevoFile('D1');
    expect(rechazado.status).toBe(422);
    expect(rechazado.body.error.code).toBe('MODALIDAD_INEXISTENTE');
    // El file existente se edita sin perderla.
    const edit = await como('patch', `/files/${conD1.body.id}`, { celular: '70000002' });
    expect(edit.status).toBe(200);
    expect(edit.body.modalidad).toBe('D1');
    expect((await como('post', `/catalogos/modalidades/${m.id}/baja`)).body.error.code).toBe('ESTADO_SIN_CAMBIO');
    expect((await como('post', `/catalogos/modalidades/${m.id}/reactivar`)).body.activo).toBe(true);
  });

  it('marcar todas las modalidades activas guarda "todas" (también las que se creen después)', async () => {
    const activas = ((await como('get', '/catalogos/modalidades')).body as { codigo: string }[]).map((m) => m.codigo);
    const r = await como('post', '/catalogos/requisitos', { nombre: 'Requisito para todas', modalidades: activas });
    expect(r.body.modalidades).toEqual([]);
    expect((await bd.requisitoTipo.findUniqueOrThrow({ where: { id: r.body.id } })).soloModalidad).toBeNull();
  });
});
