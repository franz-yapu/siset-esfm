import type { LucideIcon } from 'lucide-react';
import {
  Home,
  FolderOpen,
  FileText,
  FilePlus2,
  Route,
  Signature,
  Users2,
  ClipboardCheck,
  PackageCheck,
  Printer,
  ArrowLeftRight,
  BarChart3,
  UserCog,
  ScrollText,
  UserCircle,
  ListChecks,
} from 'lucide-react';
import type { Rol } from '@/types';

export const ROLES: Record<Rol, { nombre: string; inicio: string; badge: string }> = {
  ESTUDIANTE: { nombre: 'Estudiante', inicio: '/estudiante', badge: 'bg-acento-palido text-primario' },
  // Sin cuenta (D-08, DEC-032): si una entrara, va al seguimiento público.
  EGRESADO: { nombre: 'Egresado', inicio: '/seguimiento', badge: 'bg-acento-palido text-primario' },
  SEC_DIR: { nombre: 'Secretaría de Dirección', inicio: '/sec-dir', badge: 'bg-acento-palido text-primario' },
  SEC_COORD: {
    nombre: 'Secretaría de Coordinación',
    inicio: '/sec-coord',
    badge: 'bg-acento-palido text-primario',
  },
  COORDINADOR: {
    nombre: 'Coordinador Académico',
    inicio: '/coordinador',
    badge: 'bg-acento-palido text-primario',
  },
  KARDEX: { nombre: 'Kardex', inicio: '/kardex', badge: 'bg-acento-palido text-primario' },
  // Usuarios, roles y bitácora; no hace trámites (DEC-054).
  ADMIN: { nombre: 'Administrador', inicio: '/admin', badge: 'bg-acento-palido text-primario' },
};

/** Recursos y acciones de la política de la API (`autorizacion.politica.ts`); un test de paridad los compara. */
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
export type Recurso = (typeof RECURSOS)[number];
export type Accion = (typeof ACCIONES)[number];
export interface Permiso {
  recurso: Recurso;
  accion: Accion;
}

/**
 * Permiso de la política que exige cada pantalla (SDD S1.11 §2.2, DEC-022). Quién lo tiene lo dice
 * `GET /auth/mis-permisos`: la web no guarda roles por pantalla. Una bandeja exige la acción que se hace
 * en ella; el detalle hereda el permiso de su lista; Inicio y Mi perfil solo piden sesión.
 */
export const PERMISO_RUTA = {
  'mi-file': { recurso: 'files', accion: 'leer_propio' },
  // Hoy nadie lo tiene: los egresados no tienen cuenta (D-08); su seguimiento es público.
  'mis-tramites': { recurso: 'hojas-ruta', accion: 'leer_propio' },
  'nueva-hr': { recurso: 'hojas-ruta', accion: 'crear' },
  'hojas-ruta': { recurso: 'hojas-ruta', accion: 'leer' },
  'detalle-hr': { recurso: 'hojas-ruta', accion: 'leer' },
  caratula: { recurso: 'hojas-ruta', accion: 'leer' },
  pases: { recurso: 'pases', accion: 'crear' },
  // Puente: firma y entrega es de SEC_DIR y, en Ancocagua, de SEC_COORD (ADR-0011); no tiene permiso propio.
  entregas: { recurso: 'hojas-ruta', accion: 'crear' },
  files: { recurso: 'files', accion: 'leer' },
  'detalle-file': { recurso: 'files', accion: 'leer' },
  'nuevo-file': { recurso: 'files', accion: 'crear' },
  'editar-file': { recurso: 'files', accion: 'editar' },
  revision: { recurso: 'hojas-ruta', accion: 'editar' },
  // No hay dictamen (D-11): el Coordinador solo firma. Se reusa `dictamenes:crear` porque solo él lo tiene.
  firmas: { recurso: 'dictamenes', accion: 'crear' },
  emision: { recurso: 'documentos', accion: 'crear' },
  carga: { recurso: 'files', accion: 'crear' },
  // Catálogo de requisitos por modalidad (DEC-055): solo Kardex tiene `requisitos:crear`.
  'catalogo-requisitos': { recurso: 'requisitos', accion: 'crear' },
  reportes: { recurso: 'reportes', accion: 'leer' },
  usuarios: { recurso: 'usuarios', accion: 'leer' },
  bitacora: { recurso: 'auditoria', accion: 'leer' },
} as const satisfies Record<string, Permiso>;

export type IdRuta = keyof typeof PERMISO_RUTA;
/** `inicio` y `perfil` solo piden sesión; el resto, el permiso de su ruta. */
export type IdMenu = IdRuta | 'inicio' | 'perfil';

export interface ItemMenu {
  id: IdMenu;
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
}

/**
 * Menú lateral: SPEC §3. El orden de este arreglo es el orden en pantalla. "Bandeja de pases" y "Firma y entrega"
 * vuelven al menú, contra la API (D-36, DEC-052). Fuera del menú: "Carga masiva", que se abre desde "Files académicos"
 * con "Importar desde Excel" (DEC-064 #3).
 */
export const MENU: ItemMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', ruta: '', icono: Home },
  { id: 'mi-file', etiqueta: 'Mi file académico', ruta: '/mi-file', icono: FolderOpen },
  { id: 'mis-tramites', etiqueta: 'Mis trámites', ruta: '/mis-tramites', icono: FileText },
  { id: 'nueva-hr', etiqueta: 'Nueva hoja de ruta', ruta: '/hojas-ruta/nueva', icono: FilePlus2 },
  { id: 'hojas-ruta', etiqueta: 'Hojas de ruta', ruta: '/hojas-ruta', icono: Route },
  { id: 'files', etiqueta: 'Files académicos', ruta: '/files', icono: Users2 },
  { id: 'catalogo-requisitos', etiqueta: 'Requisitos por modalidad', ruta: '/requisitos', icono: ListChecks },
  { id: 'pases', etiqueta: 'Bandeja de pases', ruta: '/pases', icono: ArrowLeftRight },
  { id: 'entregas', etiqueta: 'Firma y entrega', ruta: '/entregas', icono: PackageCheck },
  { id: 'revision', etiqueta: 'Recojo y remisión', ruta: '/revision', icono: ClipboardCheck },
  { id: 'firmas', etiqueta: 'Firmas', ruta: '/firmas', icono: Signature },
  { id: 'emision', etiqueta: 'Impresión', ruta: '/emision', icono: Printer },
  { id: 'reportes', etiqueta: 'Reportes', ruta: '/reportes', icono: BarChart3 },
  { id: 'usuarios', etiqueta: 'Usuarios', ruta: '/usuarios', icono: UserCog },
  { id: 'bitacora', etiqueta: 'Bitácora', ruta: '/bitacora', icono: ScrollText },
  { id: 'perfil', etiqueta: 'Mi perfil', ruta: '/perfil', icono: UserCircle },
];

export const rutaInicio = (rol: Rol): string => ROLES[rol].inicio;
