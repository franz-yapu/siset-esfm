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
/** Usuarios y bitácora: solo el Administrador (DEC-054). */
const SOLO_ADMIN = ['ADMIN'] as const;
/** El personal que hace trámites: lee hojas de ruta (DEC-015). ADMIN no hace trámites (DEC-054). */
const PERSONAL = ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'] as const;
/** Leen files: el personal menos SEC_DIR (DEC-054). ESTUDIANTE solo tiene `leer_propio` ("mi file", S2.7). */
const LEEN_FILES = ['SEC_COORD', 'COORDINADOR', 'KARDEX'] as const;
const LEEN_REQUISITOS = ['SEC_COORD', 'COORDINADOR', 'KARDEX'] as const;
const ID_INEXISTENTE = 999_999;

export const RUTAS_PROTEGIDAS: readonly FilaRuta[] = [
  { metodo: 'get', documentada: '/api/v1/usuarios', ruta: '/usuarios', permitidos: SOLO_ADMIN },
  { metodo: 'post', documentada: '/api/v1/usuarios', ruta: '/usuarios', cuerpo: {}, permitidos: SOLO_ADMIN },
  {
    metodo: 'get',
    documentada: '/api/v1/usuarios/{id}',
    ruta: `/usuarios/${ID_INEXISTENTE}`,
    permitidos: SOLO_ADMIN,
  },
  {
    metodo: 'patch',
    documentada: '/api/v1/usuarios/{id}',
    ruta: `/usuarios/${ID_INEXISTENTE}`,
    cuerpo: {},
    permitidos: SOLO_ADMIN,
  },
  ...(['baja', 'reactivar', 'restablecer-password', 'desbloquear'] as const).map((accion): FilaRuta => ({
    metodo: 'post',
    documentada: `/api/v1/usuarios/{id}/${accion}`,
    ruta: `/usuarios/${ID_INEXISTENTE}/${accion}`,
    permitidos: SOLO_ADMIN,
  })),
  { metodo: 'get', documentada: '/api/v1/auditoria', ruta: '/auditoria', permitidos: SOLO_ADMIN },
  // Files (SDD S2.2, DEC-015): KARDEX crea y edita; el personal lee.
  { metodo: 'get', documentada: '/api/v1/files', ruta: '/files', permitidos: LEEN_FILES },
  { metodo: 'post', documentada: '/api/v1/files', ruta: '/files', cuerpo: {}, permitidos: SOLO_KARDEX },
  { metodo: 'get', documentada: '/api/v1/files/mio', ruta: '/files/mio', permitidos: ['ESTUDIANTE'] },
  {
    metodo: 'get',
    documentada: '/api/v1/files/mio/requisitos',
    ruta: '/files/mio/requisitos',
    permitidos: ['ESTUDIANTE'],
  },
  // Entregas de requisitos (SDD OBS-T1, observación #3): como leer los requisitos.
  { metodo: 'get', documentada: '/api/v1/files/mio/entregas', ruta: '/files/mio/entregas', permitidos: ['ESTUDIANTE'] },
  { metodo: 'get', documentada: '/api/v1/files/{id}', ruta: `/files/${ID_INEXISTENTE}`, permitidos: LEEN_FILES },
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
  // El bloqueo abierto y el PDF de su resolución (DEC-049): los lee el personal, como el file.
  {
    metodo: 'get',
    documentada: '/api/v1/files/{id}/bloqueo',
    ruta: `/files/${ID_INEXISTENTE}/bloqueo`,
    permitidos: LEEN_FILES,
  },
  {
    metodo: 'get',
    documentada: '/api/v1/files/{id}/bloqueo/pdf',
    ruta: `/files/${ID_INEXISTENTE}/bloqueo/pdf`,
    permitidos: LEEN_FILES,
  },
  // Requisitos (SDD S2.4, DEC-015): leen SEC_COORD, COORDINADOR y KARDEX; SEC_DIR no; registra KARDEX.
  {
    metodo: 'get',
    documentada: '/api/v1/files/{id}/requisitos',
    ruta: `/files/${ID_INEXISTENTE}/requisitos`,
    permitidos: LEEN_REQUISITOS,
  },
  {
    metodo: 'get',
    documentada: '/api/v1/files/{id}/entregas',
    ruta: `/files/${ID_INEXISTENTE}/entregas`,
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
  // Kardex administra el catálogo de requisitos por modalidad (DEC-055).
  {
    metodo: 'post',
    documentada: '/api/v1/catalogos/requisitos',
    ruta: '/catalogos/requisitos',
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  {
    metodo: 'get',
    documentada: '/api/v1/catalogos/requisitos/todos',
    ruta: '/catalogos/requisitos/todos',
    permitidos: SOLO_KARDEX,
  },
  {
    metodo: 'patch',
    documentada: '/api/v1/catalogos/requisitos/{id}',
    ruta: `/catalogos/requisitos/${ID_INEXISTENTE}`,
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  ...(['baja', 'reactivar'] as const).map((accion): FilaRuta => ({
    metodo: 'post',
    documentada: `/api/v1/catalogos/requisitos/{id}/${accion}`,
    ruta: `/catalogos/requisitos/${ID_INEXISTENTE}/${accion}`,
    permitidos: SOLO_KARDEX,
  })),
  // Modalidades de ingreso (DEC-058): las leen quienes leen files; las administra Kardex.
  {
    metodo: 'get',
    documentada: '/api/v1/catalogos/modalidades',
    ruta: '/catalogos/modalidades',
    permitidos: LEEN_FILES,
  },
  {
    metodo: 'post',
    documentada: '/api/v1/catalogos/modalidades',
    ruta: '/catalogos/modalidades',
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  {
    metodo: 'get',
    documentada: '/api/v1/catalogos/modalidades/todas',
    ruta: '/catalogos/modalidades/todas',
    permitidos: SOLO_KARDEX,
  },
  {
    metodo: 'patch',
    documentada: '/api/v1/catalogos/modalidades/{id}',
    ruta: `/catalogos/modalidades/${ID_INEXISTENTE}`,
    cuerpo: {},
    permitidos: SOLO_KARDEX,
  },
  ...(['baja', 'reactivar'] as const).map((accion): FilaRuta => ({
    metodo: 'post',
    documentada: `/api/v1/catalogos/modalidades/{id}/${accion}`,
    ruta: `/catalogos/modalidades/${ID_INEXISTENTE}/${accion}`,
    permitidos: SOLO_KARDEX,
  })),
  // Hojas de ruta (SDD S3.1-S3.3): Casbin exige `hojas-ruta`/`leer`; cada paso lo decide la máquina (ADR-0005).
  { metodo: 'get', documentada: '/api/v1/hojas-ruta', ruta: '/hojas-ruta', permitidos: PERSONAL },
  // Ingesta: `hojas-ruta`/`crear`: SEC_DIR, y SEC_COORD para los certificados de Ancocagua (ADR-0011).
  {
    metodo: 'post',
    documentada: '/api/v1/hojas-ruta',
    ruta: '/hojas-ruta',
    cuerpo: {},
    permitidos: ['SEC_DIR', 'SEC_COORD'],
  },
  // El buscador de titulares de la ingesta: SEC_DIR elige al egresado sin leer files (DEC-054); SEC_COORD también.
  {
    metodo: 'get',
    documentada: '/api/v1/hojas-ruta/titulares',
    ruta: '/hojas-ruta/titulares?texto=zz',
    permitidos: ['SEC_DIR', 'SEC_COORD'],
  },
  // Reportes (RF-13): `reportes`/`leer`.
  {
    metodo: 'get',
    documentada: '/api/v1/reportes/hojas-ruta',
    ruta: '/reportes/hojas-ruta',
    permitidos: ['SEC_DIR', 'COORDINADOR', 'KARDEX'],
  },
  { metodo: 'get', documentada: '/api/v1/hojas-ruta/tipos', ruta: '/hojas-ruta/tipos', permitidos: PERSONAL },
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
    permitidos: LEEN_FILES,
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
  'post /api/v1/seguimiento',
  'post /api/v1/auth/refresh',
  'post /api/v1/auth/logout',
];

export const claveDe = (f: FilaRuta): string => `${f.metodo} ${f.documentada}`;
