import { SignJWT } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ROLES, type CodigoRol } from '@/modulos/seguridad/autorizacion.politica';
import { firmarAccessToken } from '@/modulos/seguridad/jwt';
import { claveDe, RUTAS_PROTEGIDAS, RUTAS_PUBLICAS, type FilaRuta } from '../matriz-rutas';
import { appDePrueba, SECRETO_JWT_DE_PRUEBA } from './utilidades';

// Sin base (SDD S1.14 §2.1): `autenticar` no consulta la base (DEC-014 #5) y `autorizar` rechaza
// antes del controlador, así que toda denegación se prueba con la BD falsa.
const app = appDePrueba();

const tokenDe = async (rol: CodigoRol, cpw = false) =>
  (
    await firmarAccessToken(
      { usuarioId: 7, rol, sedeId: rol === 'ESTUDIANTE' ? null : 1, debeCambiarPassword: cpw },
      SECRETO_JWT_DE_PRUEBA,
      new Date(),
    )
  ).token;

const tokenDeOtroSecreto = () =>
  new SignJWT({ rol: 'KARDEX', sede: 1, cpw: false })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('7')
    .setIssuer('siset')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode('otro-secreto-distinto-de-32-caracteres!'));

const pedir = (fila: FilaRuta, token: string | null) => {
  const r = request(app)[fila.metodo](`/api/v1${fila.ruta}`);
  if (token) r.set('Authorization', `Bearer ${token}`);
  return fila.cuerpo ? r.send(fila.cuerpo) : r;
};

const permitido = (fila: FilaRuta, rol: CodigoRol) =>
  fila.permitidos === 'cualquier-sesion' || fila.permitidos.includes(rol);

const negados = RUTAS_PROTEGIDAS.flatMap((fila) =>
  ROLES.filter((rol) => !permitido(fila, rol)).map((rol) => ({ clave: claveDe(fila), rol, fila })),
);
const conCpw = RUTAS_PROTEGIDAS.filter((f) => f.permitidos !== 'cualquier-sesion').flatMap((fila) =>
  (fila.permitidos as readonly CodigoRol[]).map((rol) => ({ clave: claveDe(fila), rol, fila })),
);

describe('matriz HTTP: denegaciones (SDD S1.14 §2.1, R6)', () => {
  it.each(RUTAS_PROTEGIDAS.map((fila) => ({ clave: claveDe(fila), fila })))(
    '$clave: sin token y con un token de otro secreto → 401 NO_AUTENTICADO',
    async ({ fila }) => {
      for (const token of [null, await tokenDeOtroSecreto()]) {
        const r = await pedir(fila, token);
        expect(r.status).toBe(401);
        expect(r.body.error.code).toBe('NO_AUTENTICADO');
      }
    },
  );

  it.each(negados)('$clave · $rol → 403 PROHIBIDO', async ({ fila, rol }) => {
    const r = await pedir(fila, await tokenDe(rol));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('PROHIBIDO');
  });

  it.each(conCpw)('$clave · $rol con la contraseña por cambiar → 403 CAMBIO_PASSWORD_REQUERIDO', async ({ fila, rol }) => {
    const r = await pedir(fila, await tokenDe(rol, true));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('CAMBIO_PASSWORD_REQUERIDO');
  });

  it('ESTUDIANTE y EGRESADO no entran a ninguna ruta del personal', () => {
    const delPersonal = RUTAS_PROTEGIDAS.filter((f) => f.permitidos !== 'cualquier-sesion');
    for (const rol of ['ESTUDIANTE', 'EGRESADO'] as const)
      expect(negados.filter((n) => n.rol === rol)).toHaveLength(delPersonal.length);
  });
});

describe('guardián: toda ruta de la API está en la matriz (SDD S1.14 §2.1)', () => {
  it('las operaciones de openapi.json son exactamente las protegidas de la matriz más las públicas', async () => {
    const { body } = await request(app).get('/api/v1/openapi.json');
    const documentadas = Object.entries(body.paths as Record<string, Record<string, unknown>>).flatMap(
      ([ruta, operaciones]) => Object.keys(operaciones).map((metodo) => `${metodo} ${ruta}`),
    );
    const enLaMatriz = [...RUTAS_PROTEGIDAS.map(claveDe), ...RUTAS_PUBLICAS];
    // Si falla: una ruta nueva necesita su fila en test/matriz-rutas.ts con los roles que entran.
    expect(documentadas.sort()).toEqual(enLaMatriz.sort());
  });

  it('la matriz no repite filas', () => {
    const claves = RUTAS_PROTEGIDAS.map(claveDe);
    expect(new Set(claves).size).toBe(claves.length);
  });
});
