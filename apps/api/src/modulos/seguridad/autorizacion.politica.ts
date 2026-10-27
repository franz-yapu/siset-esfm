// ÚNICA fuente de permisos (ADR-0002, enmienda S1.6): una línea por permiso, tipada.
// Parte de la matriz RBAC del PRD §2 (DEC-015). EGRESADO no tiene cuenta (D-08), así
// que no tiene permisos. La matriz la validan Coordinación y Kardex (D-16).

export const ROLES = ['ESTUDIANTE', 'EGRESADO', 'SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX', 'ADMIN'] as const;
export const RECURSOS = [
  'usuarios',
  'files',
  'requisitos',
  'hojas-ruta',
  'pases',
  'dictamenes',
  'documentos',
  'reportes',
  'auditoria',
] as const;
export const ACCIONES = ['crear', 'leer', 'leer_propio', 'editar', 'editar_propio'] as const;

export type CodigoRol = (typeof ROLES)[number];
export type Recurso = (typeof RECURSOS)[number];
export type Accion = (typeof ACCIONES)[number];
export type Permiso = readonly [CodigoRol, Recurso, Accion];

export const POLITICA: readonly Permiso[] = [
  // Usuarios y roles: solo el Administrador, que no hace trámites (DEC-054, ADR-0009; reemplaza a D-27)
  ['ADMIN', 'usuarios', 'crear'],
  ['ADMIN', 'usuarios', 'leer'],
  ['ADMIN', 'usuarios', 'editar'],
  // File académico. SEC_DIR no ve files (DEC-054): elige al titular con /hojas-ruta/titulares.
  ['ESTUDIANTE', 'files', 'leer_propio'],
  // Su correo, celular, dirección y foto; el resto, solo Kardex (ADR-0013, DEC-064 #2).
  ['ESTUDIANTE', 'files', 'editar_propio'],
  ['SEC_COORD', 'files', 'leer'],
  ['COORDINADOR', 'files', 'leer'],
  ['KARDEX', 'files', 'crear'],
  ['KARDEX', 'files', 'leer'],
  ['KARDEX', 'files', 'editar'],
  // Requisitos (TACFI, TCLO, notas)
  ['ESTUDIANTE', 'requisitos', 'leer_propio'],
  ['SEC_COORD', 'requisitos', 'leer'],
  ['COORDINADOR', 'requisitos', 'leer'],
  ['KARDEX', 'requisitos', 'crear'],
  ['KARDEX', 'requisitos', 'leer'],
  ['KARDEX', 'requisitos', 'editar'],
  // Hoja de ruta
  ['SEC_DIR', 'hojas-ruta', 'crear'],
  ['SEC_DIR', 'hojas-ruta', 'leer'],
  // D-32b (ADR-0011): SEC_COORD recibe en Ancocagua los certificados sin valorado; la máquina decide el resto.
  ['SEC_COORD', 'hojas-ruta', 'crear'],
  ['SEC_COORD', 'hojas-ruta', 'leer'],
  ['COORDINADOR', 'hojas-ruta', 'leer'],
  ['KARDEX', 'hojas-ruta', 'leer'],
  ['KARDEX', 'hojas-ruta', 'editar'],
  // Pases
  ['SEC_DIR', 'pases', 'crear'],
  ['SEC_DIR', 'pases', 'leer'],
  ['SEC_COORD', 'pases', 'crear'],
  ['SEC_COORD', 'pases', 'leer'],
  ['COORDINADOR', 'pases', 'leer'],
  ['KARDEX', 'pases', 'crear'],
  ['KARDEX', 'pases', 'leer'],
  // Dictamen
  ['COORDINADOR', 'dictamenes', 'crear'],
  ['COORDINADOR', 'dictamenes', 'leer'],
  ['KARDEX', 'dictamenes', 'leer'],
  // Emisión e impresión
  ['KARDEX', 'documentos', 'crear'],
  ['KARDEX', 'documentos', 'leer'],
  // Dashboard y reportes
  ['SEC_DIR', 'reportes', 'leer'],
  ['COORDINADOR', 'reportes', 'leer'],
  ['KARDEX', 'reportes', 'leer'],
  // Bitácora: el Administrador (DEC-054)
  ['ADMIN', 'auditoria', 'leer'],
];

export const permisosDe = (rol: string): { recurso: Recurso; accion: Accion }[] =>
  POLITICA.filter(([r]) => r === rol).map(([, recurso, accion]) => ({ recurso, accion }));
