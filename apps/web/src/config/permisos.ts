import type { LucideIcon } from 'lucide-react';
import {
  Home,
  FolderOpen,
  FileText,
  FilePlus2,
  Route,
  ArrowLeftRight,
  PenLine,
  Users2,
  ClipboardCheck,
  Gavel,
  Printer,
  Upload,
  BarChart3,
  UserCog,
  ScrollText,
  UserCircle,
} from 'lucide-react';
import type { Rol } from '@/types';

export const ROLES: Record<Rol, { nombre: string; inicio: string; badge: string }> = {
  ESTUDIANTE: { nombre: 'Estudiante', inicio: '/estudiante', badge: 'bg-teal-50 text-teal-700 ring-teal-300' },
  EGRESADO: { nombre: 'Egresado', inicio: '/egresado', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-300' },
  SEC_DIR: { nombre: 'Secretaría de Dirección', inicio: '/sec-dir', badge: 'bg-sky-50 text-sky-700 ring-sky-300' },
  SEC_COORD: {
    nombre: 'Secretaría de Coordinación',
    inicio: '/sec-coord',
    badge: 'bg-blue-50 text-blue-700 ring-blue-300',
  },
  COORDINADOR: {
    nombre: 'Coordinador Académico',
    inicio: '/coordinador',
    badge: 'bg-violet-50 text-violet-700 ring-violet-300',
  },
  KARDEX: { nombre: 'Kardex', inicio: '/kardex', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-300' },
};

export interface ItemMenu {
  id: string;
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
  roles: Rol[];
}

const TODOS: Rol[] = ['ESTUDIANTE', 'EGRESADO', 'SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'];
const PERSONAL_FILES: Rol[] = ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'];

/** Menú lateral: SPEC §3. El orden de este arreglo es el orden en pantalla. */
export const MENU: ItemMenu[] = [
  { id: 'inicio', etiqueta: 'Inicio', ruta: '', icono: Home, roles: TODOS },
  {
    id: 'mi-file',
    etiqueta: 'Mi file académico',
    ruta: '/mi-file',
    icono: FolderOpen,
    roles: ['ESTUDIANTE', 'EGRESADO'],
  },
  { id: 'mis-tramites', etiqueta: 'Mis trámites', ruta: '/mis-tramites', icono: FileText, roles: ['EGRESADO'] },
  { id: 'nueva-hr', etiqueta: 'Nueva hoja de ruta', ruta: '/hojas-ruta/nueva', icono: FilePlus2, roles: ['SEC_DIR'] },
  { id: 'hojas-ruta', etiqueta: 'Hojas de ruta', ruta: '/hojas-ruta', icono: Route, roles: PERSONAL_FILES },
  {
    id: 'pases',
    etiqueta: 'Bandeja de pases',
    ruta: '/pases',
    icono: ArrowLeftRight,
    roles: ['SEC_DIR', 'SEC_COORD', 'KARDEX'],
  },
  { id: 'entregas', etiqueta: 'Firma y entrega', ruta: '/entregas', icono: PenLine, roles: ['SEC_DIR'] },
  { id: 'files', etiqueta: 'Files académicos', ruta: '/files', icono: Users2, roles: PERSONAL_FILES },
  { id: 'revision', etiqueta: 'Revisión de trámites', ruta: '/revision', icono: ClipboardCheck, roles: ['KARDEX'] },
  { id: 'dictamenes', etiqueta: 'Dictámenes', ruta: '/dictamenes', icono: Gavel, roles: ['COORDINADOR'] },
  { id: 'emision', etiqueta: 'Emisión de documentos', ruta: '/emision', icono: Printer, roles: ['KARDEX'] },
  { id: 'carga', etiqueta: 'Carga masiva', ruta: '/carga-masiva', icono: Upload, roles: ['KARDEX'] },
  {
    id: 'reportes',
    etiqueta: 'Reportes',
    ruta: '/reportes',
    icono: BarChart3,
    roles: ['SEC_DIR', 'COORDINADOR', 'KARDEX'],
  },
  { id: 'usuarios', etiqueta: 'Usuarios', ruta: '/usuarios', icono: UserCog, roles: ['KARDEX'] },
  { id: 'bitacora', etiqueta: 'Bitácora', ruta: '/bitacora', icono: ScrollText, roles: ['KARDEX'] },
  { id: 'perfil', etiqueta: 'Mi perfil', ruta: '/perfil', icono: UserCircle, roles: TODOS },
];

export const rutaInicio = (rol: Rol): string => ROLES[rol].inicio;

/** Roles que pueden abrir una ruta: las rutas de detalle heredan los permisos de su lista. */
export const PERMISOS_RUTA: Record<string, Rol[]> = {
  ...Object.fromEntries(MENU.filter((m) => m.ruta).map((m) => [m.id, m.roles])),
  'detalle-hr': PERSONAL_FILES,
  caratula: PERSONAL_FILES,
  'detalle-file': PERSONAL_FILES,
  'form-file': ['KARDEX'],
  'emitir-dictamen': ['COORDINADOR'],
};

export const puedeVer = (rol: Rol, permiso: string): boolean => PERMISOS_RUTA[permiso]?.includes(rol) ?? false;

/** Solo KARDEX edita files; el resto del personal los ve en solo lectura. */
export const puedeEditarFiles = (rol: Rol): boolean => rol === 'KARDEX';
