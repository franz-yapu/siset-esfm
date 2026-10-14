import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { ROLES, type CodigoRol } from '@/modulos/seguridad/autorizacion.politica';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { claveDe, RUTAS_PROTEGIDAS } from '../matriz-rutas';
import { configDePrueba, SECRETO_JWT_DE_PRUEBA } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

// Celdas permitidas de la matriz HTTP (SDD S1.14 §2.1), con la app y la base reales. Las filas usan
// ids inexistentes y cuerpos inválidos: solo se afirma "ni 401 ni 403", sin escribir nada.
const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba() });
let kardexId = 0;
let usuariosAntes = 0;
let eventosAntes = 0;

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  kardexId = (await bd.usuario.findUniqueOrThrow({ where: { username: KARDEX_DE_PRUEBA.ci } })).id;
  usuariosAntes = await bd.usuario.count();
  eventosAntes = await bd.logAuditoria.count();
});
afterAll(() => bd.$disconnect());

const permitidas = RUTAS_PROTEGIDAS.flatMap((fila) =>
  (fila.permitidos === 'cualquier-sesion' ? ROLES : fila.permitidos).map((rol: CodigoRol) => ({
    clave: claveDe(fila),
    rol,
    fila,
  })),
);

describe('matriz HTTP: celdas permitidas (SDD S1.14 §2.1)', () => {
  it.each(permitidas)('$clave · $rol → ni 401 ni 403', async ({ fila, rol }) => {
    const { token } = await firmarAccessToken(
      { usuarioId: kardexId, rol, sedeId: null, debeCambiarPassword: false },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    );
    const r = request(app)[fila.metodo](`/api/v1${fila.ruta}`).set('Authorization', `Bearer ${token}`);
    const respuesta = await (fila.cuerpo ? r.send(fila.cuerpo) : r);
    expect([401, 403]).not.toContain(respuesta.status);
    expect(respuesta.status).toBeLessThan(500);
  });

  it('la base no cambió: ni usuarios ni eventos nuevos', async () => {
    expect(await bd.usuario.count()).toBe(usuariosAntes);
    expect(await bd.logAuditoria.count()).toBe(eventosAntes);
  });
});
