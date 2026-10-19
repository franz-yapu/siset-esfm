import type { Rol } from '@/types';
import type { Accion, Recurso } from '@/config/permisos';

/**
 * Copia literal de la POLITICA de la API (`apps/api/src/modulos/seguridad/autorizacion.politica.ts`,
 * DEC-015) para el modo demo: el menú del mock es el mismo que el del piloto. Un test de paridad
 * falla si se desalinean (SDD S1.11 §2.3).
 */
export const POLITICA_MOCK: readonly (readonly [Rol, Recurso, Accion])[] = [
  ['ADMIN', 'usuarios', 'crear'],
  ['ADMIN', 'usuarios', 'leer'],
  ['ADMIN', 'usuarios', 'editar'],
  ['ESTUDIANTE', 'files', 'leer_propio'],
  ['SEC_COORD', 'files', 'leer'],
  ['COORDINADOR', 'files', 'leer'],
  ['KARDEX', 'files', 'crear'],
  ['KARDEX', 'files', 'leer'],
  ['KARDEX', 'files', 'editar'],
  ['ESTUDIANTE', 'requisitos', 'leer_propio'],
  ['SEC_COORD', 'requisitos', 'leer'],
  ['COORDINADOR', 'requisitos', 'leer'],
  ['KARDEX', 'requisitos', 'crear'],
  ['KARDEX', 'requisitos', 'leer'],
  ['KARDEX', 'requisitos', 'editar'],
  ['SEC_DIR', 'hojas-ruta', 'crear'],
  ['SEC_DIR', 'hojas-ruta', 'leer'],
  ['SEC_COORD', 'hojas-ruta', 'leer'],
  ['COORDINADOR', 'hojas-ruta', 'leer'],
  ['KARDEX', 'hojas-ruta', 'leer'],
  ['KARDEX', 'hojas-ruta', 'editar'],
  ['SEC_DIR', 'pases', 'crear'],
  ['SEC_DIR', 'pases', 'leer'],
  ['SEC_COORD', 'pases', 'crear'],
  ['SEC_COORD', 'pases', 'leer'],
  ['COORDINADOR', 'pases', 'leer'],
  ['KARDEX', 'pases', 'crear'],
  ['KARDEX', 'pases', 'leer'],
  ['COORDINADOR', 'dictamenes', 'crear'],
  ['COORDINADOR', 'dictamenes', 'leer'],
  ['KARDEX', 'dictamenes', 'leer'],
  ['KARDEX', 'documentos', 'crear'],
  ['KARDEX', 'documentos', 'leer'],
  ['SEC_DIR', 'reportes', 'leer'],
  ['COORDINADOR', 'reportes', 'leer'],
  ['KARDEX', 'reportes', 'leer'],
  ['ADMIN', 'auditoria', 'leer'],
];
