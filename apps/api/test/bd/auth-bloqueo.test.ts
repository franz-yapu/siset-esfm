import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { leerParametroEntero } from '@/modulos/catalogos';
import { hashPassword } from '@/modulos/seguridad';
import { configDePrueba } from '../http/utilidades';
import { clienteDeTest, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });
const PASSWORD = 'clave-1234';
const MALA = 'otra-1234';
const ERROR_401 = { error: { code: 'CREDENCIALES_INVALIDAS', message: 'CI o contraseña incorrectos.' } };
let siguienteCi = 5550100;
let hashPrueba = '';

/** Usuario nuevo por test, para que los contadores no se mezclen. */
async function nuevoUsuario() {
  const ci = String(siguienteCi++);
  const rol = await bd.rol.findUniqueOrThrow({ where: { codigo: 'KARDEX' } });
  const persona = await bd.persona.create({ data: { ci, nombres: 'Prueba', apellidoPaterno: 'Bloqueo' } });
  const u = await bd.usuario.create({
    data: { personaId: persona.id, rolId: rol.id, username: ci, passwordHash: hashPrueba, debeCambiarPassword: false },
  });
  return { ci, id: u.id };
}

const login = (ci: string, password: string) => request(app).post('/api/v1/auth/login').send({ usuario: ci, password });
const estado = (id: number) =>
  bd.usuario.findUniqueOrThrow({ where: { id }, select: { intentosFallidos: true, bloqueadoHasta: true } });
const eventosDe = (id: number) =>
  bd.logAuditoria.findMany({ where: { entidad: 'usuario', entidadId: String(id) }, orderBy: { id: 'asc' } });

beforeAll(async () => {
  await sembrar(bd, KARDEX_DE_PRUEBA);
  hashPrueba = await hashPassword(PASSWORD);
});
afterEach(async () => {
  // Restaura los parámetros que algún test cambia.
  await bd.parametro.update({ where: { clave: 'MAX_INTENTOS_LOGIN' }, data: { valor: '5' } });
  await bd.parametro.update({ where: { clave: 'MIN_BLOQUEO_LOGIN' }, data: { valor: '15' } });
});
afterAll(() => bd.$disconnect());

describe('bloqueo tras intentos fallidos (SDD S1.4 §2.1)', () => {
  it('el 5.º error bloquea 15 min, deja el contador en 0 y registra LOGIN_FALLIDO + BLOQUEO_CUENTA', async () => {
    const { ci, id } = await nuevoUsuario();
    for (let i = 1; i <= 4; i++) expect((await login(ci, MALA)).status).toBe(401);
    expect(await estado(id)).toEqual({ intentosFallidos: 4, bloqueadoHasta: null });

    const antes = Date.now();
    const r = await login(ci, MALA);
    expect(r.body).toEqual(ERROR_401);
    const { intentosFallidos, bloqueadoHasta } = await estado(id);
    expect(intentosFallidos).toBe(0);
    expect(bloqueadoHasta!.getTime()).toBeGreaterThanOrEqual(antes + 15 * 60_000 - 1000);
    expect(bloqueadoHasta!.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);

    const eventos = await eventosDe(id);
    expect(eventos.map((e) => e.accion)).toEqual([...Array(5).fill('LOGIN_FALLIDO'), 'BLOQUEO_CUENTA']);
    expect(eventos[4].datosDespues).toEqual({ motivo: 'PASSWORD_INCORRECTA', intentosFallidos: 5 });
    expect(eventos[5].datosDespues).toEqual({ bloqueadoHasta: bloqueadoHasta!.toISOString() });
  });

  it('durante el bloqueo, la contraseña correcta da el mismo 401 y CUENTA_BLOQUEADA', async () => {
    const { ci, id } = await nuevoUsuario();
    for (let i = 0; i < 5; i++) await login(ci, MALA);
    const r = await login(ci, PASSWORD);
    expect(r.status).toBe(401);
    expect(r.body).toEqual(ERROR_401);
    expect((await eventosDe(id)).at(-1)).toMatchObject({
      accion: 'LOGIN_FALLIDO',
      datosDespues: { motivo: 'CUENTA_BLOQUEADA' },
    });
  });

  it('durante el bloqueo, un error no suma ni extiende el bloqueo', async () => {
    const { ci, id } = await nuevoUsuario();
    for (let i = 0; i < 5; i++) await login(ci, MALA);
    const bloqueo = await estado(id);
    await login(ci, MALA);
    await login(ci, MALA);
    expect(await estado(id)).toEqual(bloqueo);
    expect((await eventosDe(id)).filter((e) => e.accion === 'BLOQUEO_CUENTA')).toHaveLength(1);
  });

  it('con el bloqueo vencido, la contraseña correcta entra y limpia el bloqueo', async () => {
    const { ci, id } = await nuevoUsuario();
    for (let i = 0; i < 5; i++) await login(ci, MALA);
    await bd.usuario.update({ where: { id }, data: { bloqueadoHasta: new Date(Date.now() - 1000) } });
    expect((await login(ci, PASSWORD)).status).toBe(200);
    expect(await estado(id)).toEqual({ intentosFallidos: 0, bloqueadoHasta: null });
  });

  it('un login correcto después de 3 errores deja el contador en 0', async () => {
    const { ci, id } = await nuevoUsuario();
    for (let i = 0; i < 3; i++) await login(ci, MALA);
    expect((await estado(id)).intentosFallidos).toBe(3);
    expect((await login(ci, PASSWORD)).status).toBe(200);
    expect((await estado(id)).intentosFallidos).toBe(0);
  });

  it('usa los valores de la tabla parametro: con 3 intentos y 1 minuto, bloquea al 3.º error por 1 minuto', async () => {
    await bd.parametro.update({ where: { clave: 'MAX_INTENTOS_LOGIN' }, data: { valor: '3' } });
    await bd.parametro.update({ where: { clave: 'MIN_BLOQUEO_LOGIN' }, data: { valor: '1' } });
    const { ci, id } = await nuevoUsuario();
    await login(ci, MALA);
    await login(ci, MALA);
    expect((await estado(id)).bloqueadoHasta).toBeNull();
    const antes = Date.now();
    await login(ci, MALA);
    const { bloqueadoHasta } = await estado(id);
    expect(bloqueadoHasta!.getTime()).toBeGreaterThanOrEqual(antes + 60_000 - 1000);
    expect(bloqueadoHasta!.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it('dos errores simultáneos suman 2 (atómico)', async () => {
    const { ci, id } = await nuevoUsuario();
    await Promise.all([login(ci, MALA), login(ci, MALA)]);
    expect((await estado(id)).intentosFallidos).toBe(2);
  });
});

describe('leerParametroEntero (SDD S1.4 §2.2)', () => {
  it.each(['abc', '0', '-3', '2.5', ''])('lanza con el valor inválido "%s"', async (valor) => {
    await bd.parametro.update({ where: { clave: 'MIN_BLOQUEO_LOGIN' }, data: { valor } });
    await expect(leerParametroEntero(bd, 'MIN_BLOQUEO_LOGIN')).rejects.toThrow(/MIN_BLOQUEO_LOGIN/);
  });

  it('lanza si la clave no existe y lee bien un valor válido', async () => {
    expect(await leerParametroEntero(bd, 'MAX_INTENTOS_LOGIN')).toBe(5);
    await bd.parametro.delete({ where: { clave: 'MAX_INTENTOS_LOGIN' } });
    try {
      await expect(leerParametroEntero(bd, 'MAX_INTENTOS_LOGIN')).rejects.toThrow(/MAX_INTENTOS_LOGIN/);
    } finally {
      await bd.parametro.create({
        data: {
          clave: 'MAX_INTENTOS_LOGIN',
          valor: '5',
          descripcion: 'Intentos fallidos seguidos antes de bloquear la cuenta',
        },
      });
    }
  });
});
