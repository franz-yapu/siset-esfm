import type { CodigoRol } from '@/modulos/seguridad/autorizacion.politica';

/**
 * Matriz HTTP de rutas (SDD S1.14 §2.1), ESCRITA A MANO desde DEC-015 (PRD §2), no derivada de
 * la política ni de las rutas: si alguien agrega una ruta o cambia un permiso, este archivo
 * obliga a decidir quién entra. La comparten `http/matriz-rutas.test.ts` (denegaciones, sin base)
 * y `bd/matriz-rutas.test.ts` (celdas permitidas, con base).
 */
export type Metodo = 'get' | 'post' | 'patch';

export interface FilaRuta {
  metodo: Metodo;
  /** Ruta tal como la documenta OpenAPI (`/api/v1/usuarios/{id}`). */
  documentada: string;
  /** Ruta concreta a pedir: ids inexistentes y cuerpos inválidos, para no escribir nada. */
  ruta: string;
  cuerpo?: object;
  /** Roles que pasan; `'cualquier-sesion'` = todos, aun con la contraseña por cambiar. */
  permitidos: readonly CodigoRol[] | 'cualquier-sesion';
}

const SOLO_KARDEX = ['KARDEX'] as const;
const ID_INEXISTENTE = 999_999;

export const RUTAS_PROTEGIDAS: readonly FilaRuta[] = [
  { metodo: 'get', documentada: '/api/v1/usuarios', ruta: '/usuarios', permitidos: SOLO_KARDEX },
  { metodo: 'post', documentada: '/api/v1/usuarios', ruta: '/usuarios', cuerpo: {}, permitidos: SOLO_KARDEX },
  {
    metodo: 'get',
    documentada: '/api/v1/usuarios/{id}',
    ruta: `/usuarios/${ID_INEXISTENTE}`,
    permitidos: SOLO_KARDEX,
  },
  {
    metodo: 'patch',
    documentada: '/api/v1/usuarios/{id}',
    ruta: `/usuarios/${ID_INEXISTENTE}`,
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  ...(['baja', 'reactivar', 'restablecer-password', 'desbloquear'] as const).map((accion): FilaRuta => ({
    metodo: 'post',
    documentada: `/api/v1/usuarios/{id}/${accion}`,
    ruta: `/usuarios/${ID_INEXISTENTE}/${accion}`,
    permitidos: SOLO_KARDEX,
  })),
  { metodo: 'get', documentada: '/api/v1/auditoria', ruta: '/auditoria', permitidos: SOLO_KARDEX },
  // Sin `autorizar`: la web arma el menú con esto aun con cpw (DEC-015 #6, SDD S1.6 §2.5).
  {
    metodo: 'get',
    documentada: '/api/v1/auth/mis-permisos',
    ruta: '/auth/mis-permisos',
    permitidos: 'cualquier-sesion',
  },
  // Es justamente lo que se hace con cpw (DEC-014 #4). Cuerpo inválido → 400, no cambia nada.
  {
    metodo: 'post',
    documentada: '/api/v1/auth/cambiar-password',
    ruta: '/auth/cambiar-password',
    cuerpo: {},
    permitidos: 'cualquier-sesion',
  },
];

/** Rutas sin access token (DEC-012, DEC-014 #1). */
export const RUTAS_PUBLICAS: readonly string[] = [
  'get /api/v1/health',
  'post /api/v1/auth/login',
  'post /api/v1/auth/refresh',
  'post /api/v1/auth/logout',
];

export const claveDe = (f: FilaRuta): string => `${f.metodo} ${f.documentada}`;
