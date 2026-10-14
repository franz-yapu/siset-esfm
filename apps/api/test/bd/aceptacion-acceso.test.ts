import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearApp } from '@/app';
import { configDePrueba } from '../http/utilidades';
import { clienteDeTest, cookieRefresh, KARDEX_DE_PRUEBA } from './utilidades';
import { sembrar } from '../../prisma/semilla';

/**
 * Recorrido de aceptación del acceso (SDD S1.14 §2.2, PI-01). No repite los casos de S1.3–S1.8:
 * los encadena con el seed real y verifica que la bitácora cuente la historia completa (DEC-007).
 */
const bd = clienteDeTest();
const app = crearApp({ bd, config: configDePrueba({ loginLimitePorMinuto: 1000 }) });

// Un Kardex inicial propio: nace del seed con la contraseña por cambiar, sin que otro archivo lo toque.
const KARDEX_INICIAL = { ...KARDEX_DE_PRUEBA, ci: '9000140' };
const NUEVA_KARDEX = 'kardex.nueva-140';
const NUEVA_SEC_DIR = 'secdir.nueva-141';
const CI_SEC_DIR = '9000141';

const login = (usuario: string, password: string) =>
  request(app).post('/api/v1/auth/login').send({ usuario, password });
const con = (token: string, metodo: 'get' | 'post', ruta: string, cuerpo?: object) => {
  const r = request(app)[metodo](`/api/v1${ruta}`).set('Authorization', `Bearer ${token}`);
  return cuerpo ? r.send(cuerpo) : r;
};
const cambiar = (token: string, passwordActual: string, passwordNueva: string) =>
  con(token, 'post', '/auth/cambiar-password', { passwordActual, passwordNueva });

beforeAll(async () => {
  await sembrar(bd, KARDEX_INICIAL);
  // Otros archivos cambian estos parámetros: el recorrido usa los valores de la regla (5 intentos, 15 min).
  for (const [clave, valor] of [
    ['MAX_INTENTOS_LOGIN', '5'],
    ['MIN_BLOQUEO_LOGIN', '15'],
  ])
    await bd.parametro.upsert({ where: { clave }, create: { clave, valor }, update: { valor } });
});
afterAll(() => bd.$disconnect());

describe('recorrido de aceptación del acceso (SDD S1.14 §2.2)', () => {
  it('Kardex del seed → cambia su contraseña → crea un SEC_DIR → 403 → bloqueo → desbloqueo → bitácora', async () => {
    // 1. Kardex entra con la contraseña del seed: solo puede ver sus permisos y cambiarla.
    const primero = await login(KARDEX_INICIAL.ci, KARDEX_INICIAL.password);
    expect(primero.status).toBe(200);
    expect(primero.body.usuario.debeCambiarPassword).toBe(true);
    const kardexCpw = primero.body.accessToken as string;
    const bloqueado = await con(kardexCpw, 'get', '/usuarios');
    expect(bloqueado.status).toBe(403);
    expect(bloqueado.body.error.code).toBe('CAMBIO_PASSWORD_REQUERIDO');
    expect((await con(kardexCpw, 'get', '/auth/mis-permisos')).status).toBe(200);

    // 2. La cambia y ya administra usuarios.
    const cambio = await cambiar(kardexCpw, KARDEX_INICIAL.password, NUEVA_KARDEX);
    expect(cambio.status).toBe(200);
    expect(cambio.body.usuario.debeCambiarPassword).toBe(false);
    const kardex = cambio.body.accessToken as string;
    const kardexId = cambio.body.usuario.id as number;
    expect((await con(kardex, 'get', '/usuarios')).status).toBe(200);

    // 3. Crea un SEC_DIR, que entra con la temporal, la cambia y vuelve a entrar.
    const sedeId = (await bd.sede.findUniqueOrThrow({ where: { codigo: 'LA_PAZ' } })).id;
    const creado = await con(kardex, 'post', '/usuarios', {
      ci: CI_SEC_DIR,
      nombres: 'Rosa',
      apellidoPaterno: 'Aceptación',
      rol: 'SEC_DIR',
      sedeId,
    });
    expect(creado.status).toBe(201);
    const secDirId = creado.body.usuario.id as number;
    const temporal = await login(CI_SEC_DIR, creado.body.passwordTemporal);
    expect(temporal.body.usuario.debeCambiarPassword).toBe(true);
    expect((await cambiar(temporal.body.accessToken, creado.body.passwordTemporal, NUEVA_SEC_DIR)).status).toBe(200);
    const sesion = await login(CI_SEC_DIR, NUEVA_SEC_DIR);
    expect(sesion.status).toBe(200);
    const secDir = sesion.body.accessToken as string;

    // 4. URL directa a lo que no es suyo: 403.
    for (const ruta of ['/usuarios', `/usuarios/${kardexId}`, '/auditoria']) {
      const r = await con(secDir, 'get', ruta);
      expect(r.status, ruta).toBe(403);
      expect(r.body.error.code).toBe('PROHIBIDO');
    }

    // 5. Cinco errores lo bloquean; con la correcta, el mismo 401 genérico.
    for (let i = 0; i < 5; i++) {
      const r = await login(CI_SEC_DIR, 'equivocada.1');
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe('CREDENCIALES_INVALIDAS');
    }
    const durante = await login(CI_SEC_DIR, NUEVA_SEC_DIR);
    expect(durante.status).toBe(401);
    expect(durante.body.error.code).toBe('CREDENCIALES_INVALIDAS');

    // 6. Kardex lo desbloquea y entra.
    expect((await con(kardex, 'post', `/usuarios/${secDirId}/desbloquear`)).status).toBe(200);
    const despues = await login(CI_SEC_DIR, NUEVA_SEC_DIR);
    expect(despues.status).toBe(200);

    // 7. Cierra sesión: su refresh ya no sirve (y usarlo se registra como reuso).
    const refresh = cookieRefresh(despues.headers)!;
    const cookie = `siset_refresh=${refresh}`;
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)).status).toBe(401);

    // 8. La bitácora cuenta la historia, en orden, sin contraseñas.
    const bitacora = async (filtro: string) => {
      const r = await con(kardex, 'get', `/auditoria?${filtro}&porPagina=100`);
      expect(r.status).toBe(200);
      return (r.body.datos as { accion: string; despues: unknown; antes: unknown }[]).reverse();
    };
    const delSecDir = await bitacora(`usuarioId=${secDirId}`);
    expect(delSecDir.map((e) => e.accion)).toEqual([
      'LOGIN',
      'CAMBIAR_PASSWORD',
      'LOGIN',
      ...Array<string>(5).fill('LOGIN_FALLIDO'),
      'BLOQUEO_CUENTA',
      'LOGIN_FALLIDO',
      'LOGIN',
      'LOGOUT',
      // El refresh de una sesión cerrada cuenta como reuso (DEC-014 #3: el token ya estaba revocado).
      'REUSO_SESION',
    ]);
    expect(delSecDir.filter((e) => e.accion === 'LOGIN_FALLIDO').map((e) => (e.despues as { motivo: string }).motivo))
      .toEqual([...Array<string>(5).fill('PASSWORD_INCORRECTA'), 'CUENTA_BLOQUEADA']);

    const deKardex = await bitacora(`usuarioId=${kardexId}`);
    expect(deKardex.map((e) => e.accion)).toEqual(['LOGIN', 'CAMBIAR_PASSWORD', 'CREAR', 'DESBLOQUEAR_CUENTA']);

    const todo = JSON.stringify([...delSecDir, ...deKardex]);
    for (const secreto of [KARDEX_INICIAL.password, NUEVA_KARDEX, NUEVA_SEC_DIR, creado.body.passwordTemporal])
      expect(todo).not.toContain(secreto);
  });
});
