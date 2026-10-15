import type { CodigoRol } from '@/modulos/seguridad/autorizacion.politica';

/**
 * Matriz HTTP de rutas (SDD S1.14 §2.1), ESCRITA A MANO desde DEC-015 (PRD §2), no derivada de
 * la política ni de las rutas: si alguien agrega una ruta o cambia un permiso, este archivo
 * obliga a decidir quién entra. La comparten `http/matriz-rutas.test.ts` (denegaciones, sin base)
 * y `bd/matriz-rutas.test.ts` (celdas permitidas, con base).
 */
export type Metodo = 'get' | 'post' | 'patch' | 'put';

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
/** Leen files: el personal (DEC-015). ESTUDIANTE solo tiene `leer_propio` ("mi file", S2.7). */
const PERSONAL = ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'] as const;
const LEEN_REQUISITOS = ['SEC_COORD', 'COORDINADOR', 'KARDEX'] as const;
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
  // Files (SDD S2.2, DEC-015): KARDEX crea y edita; el personal lee.
  { metodo: 'get', documentada: '/api/v1/files', ruta: '/files', permitidos: PERSONAL },
  { metodo: 'post', documentada: '/api/v1/files', ruta: '/files', cuerpo: {}, permitidos: SOLO_KARDEX },
  { metodo: 'get', documentada: '/api/v1/files/{id}', ruta: `/files/${ID_INEXISTENTE}`, permitidos: PERSONAL },
  {
    metodo: 'patch',
    documentada: '/api/v1/files/{id}',
    ruta: `/files/${ID_INEXISTENTE}`,
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  ...(['bloqueo', 'desbloqueo'] as const).map((accion): FilaRuta => ({
    metodo: 'post',
    documentada: `/api/v1/files/{id}/${accion}`,
    ruta: `/files/${ID_INEXISTENTE}/${accion}`,
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  })),
  // Requisitos (SDD S2.4, DEC-015): leen SEC_COORD, COORDINADOR y KARDEX; SEC_DIR no; registra KARDEX.
  {
    metodo: 'get',
    documentada: '/api/v1/files/{id}/requisitos',
    ruta: `/files/${ID_INEXISTENTE}/requisitos`,
    permitidos: LEEN_REQUISITOS,
  },
  {
    metodo: 'put',
    documentada: '/api/v1/files/{id}/requisitos/{codigo}',
    ruta: `/files/${ID_INEXISTENTE}/requisitos/TACFI_1`,
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  {
    metodo: 'get',
    documentada: '/api/v1/catalogos/requisitos',
    ruta: '/catalogos/requisitos',
    permitidos: LEEN_REQUISITOS,
  },
  // Hojas de ruta (SDD S3.1-S3.3): Casbin exige `hojas-ruta`/`leer`; cada paso lo decide la máquina (ADR-0005).
  { metodo: 'get', documentada: '/api/v1/hojas-ruta', ruta: '/hojas-ruta', permitidos: PERSONAL },
  // Ingesta: `hojas-ruta`/`crear`, solo SEC_DIR (DEC-015, SDD S3.2-S3.4).
  { metodo: 'post', documentada: '/api/v1/hojas-ruta', ruta: '/hojas-ruta', cuerpo: {}, permitidos: ['SEC_DIR'] },
  { metodo: 'get', documentada: '/api/v1/hojas-ruta/{nro}', ruta: '/hojas-ruta/HR-2099-999999', permitidos: PERSONAL },
  {
    metodo: 'post',
    documentada: '/api/v1/hojas-ruta/{nro}/transiciones',
    ruta: '/hojas-ruta/HR-2099-999999/transiciones',
    cuerpo: {},
    permitidos: PERSONAL,
  },
  {
    metodo: 'get',
    documentada: '/api/v1/catalogos/especialidades',
    ruta: '/catalogos/especialidades',
    permitidos: PERSONAL,
  },
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
