import { describe, expect, it } from 'vitest';
import type { Rol, Usuario } from '@/types';
import { PERMISO_RUTA, type IdMenu, type IdRuta } from '@/config/permisos';
import { permisosMock } from '@/services/permisos.mock';
import { ErrorApi } from './errores';
import { cumple, esAccesoDenegado, itemsDelMenu, puedeAbrirRuta } from './permisos';

const usuario = (rol: Rol): Usuario => ({ id: 1, usuario: 'x', nombre: 'X', rol, sedeId: null, activo: true });
const permisosDe = async (rol: Rol) => (await permisosMock.misPermisos(usuario(rol))).permisos;

/** Tabla de verdad del menú por rol con la política vigente (SDD S1.11 §2.2). */
const MENU_ESPERADO: Record<Rol, IdMenu[]> = {
  ESTUDIANTE: ['inicio', 'mi-file', 'perfil'],
  // D-08: los egresados no tienen cuenta, así que no tienen permisos.
  EGRESADO: ['inicio', 'perfil'],
  // "Bandeja de pases" y "Firma y entrega" vuelven al menú (D-36, DEC-052). Sin files (DEC-054).
  SEC_DIR: ['inicio', 'nueva-hr', 'hojas-ruta', 'pases', 'entregas', 'reportes', 'perfil'],
  SEC_COORD: ['inicio', 'hojas-ruta', 'files', 'pases', 'perfil'],
  COORDINADOR: ['inicio', 'hojas-ruta', 'files', 'firmas', 'reportes', 'perfil'],
  // Usuarios y Bitácora pasan al Administrador; Kardex administra los requisitos por modalidad (DEC-054, DEC-055).
  KARDEX: [
    'inicio',
    'hojas-ruta',
    'files',
    'catalogo-requisitos',
    'pases',
    'revision',
    'emision',
    'reportes',
    'perfil',
  ],
  ADMIN: ['inicio', 'usuarios', 'bitacora', 'perfil'],
};

/** Pantallas fuera del menú: quién puede abrirlas. */
const OTRAS_RUTAS: Partial<Record<IdRuta, Rol[]>> = {
  'detalle-hr': ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'],
  caratula: ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'],
  'detalle-file': ['SEC_COORD', 'COORDINADOR', 'KARDEX'],
  'nuevo-file': ['KARDEX'],
  'editar-file': ['KARDEX'],
  'mis-tramites': [],
  // Fuera del menú (DEC-044), pero con su permiso.
  carga: ['KARDEX'],
};

const ROLES = Object.keys(MENU_ESPERADO) as Rol[];

describe('permisos de la web (SDD S1.11 §2.2)', () => {
  it.each(ROLES)('el menú de %s sale de la política', async (rol) => {
    expect(itemsDelMenu(await permisosDe(rol)).map((m) => m.id)).toEqual(MENU_ESPERADO[rol]);
  });

  it.each(Object.entries(OTRAS_RUTAS))('la pantalla %s la abren solo sus roles', async (id, roles) => {
    for (const rol of ROLES) {
      expect(puedeAbrirRuta(await permisosDe(rol), id as IdRuta), `${rol} en ${id}`).toBe(roles.includes(rol));
    }
  });

  it('cada ruta exige un permiso de la política', () => {
    for (const p of Object.values(PERMISO_RUTA)) expect(p.recurso && p.accion).toBeTruthy();
  });

  it('Inicio y Mi perfil solo piden sesión; sin permisos no se abre nada más', () => {
    expect(itemsDelMenu([]).map((m) => m.id)).toEqual(['inicio', 'perfil']);
    expect(puedeAbrirRuta([], 'usuarios')).toBe(false);
  });

  it('cumple compara recurso y acción', () => {
    const permisos = [{ recurso: 'files', accion: 'leer' }] as const;
    expect(cumple(permisos, { recurso: 'files', accion: 'leer' })).toBe(true);
    expect(cumple(permisos, { recurso: 'files', accion: 'editar' })).toBe(false);
  });
});

describe('esAccesoDenegado (SDD S1.11 §2.5)', () => {
  it('solo el 403 por falta de permiso', () => {
    expect(esAccesoDenegado(new ErrorApi('No', 'PROHIBIDO', 403))).toBe(true);
    expect(esAccesoDenegado(new ErrorApi('Cambie', 'CAMBIO_PASSWORD_REQUERIDO', 403))).toBe(false);
    expect(esAccesoDenegado(new ErrorApi('Sesión', 'NO_AUTENTICADO', 401))).toBe(false);
    expect(esAccesoDenegado(new ErrorApi('No existe', 'NO_ENCONTRADO', 404))).toBe(false);
    expect(esAccesoDenegado(new ErrorApi('Red', 'SIN_CONEXION'))).toBe(false);
    expect(esAccesoDenegado(new Error('otro'))).toBe(false);
  });
});
