import { MENU, PERMISO_RUTA, type IdMenu, type ItemMenu, type Permiso } from '@/config/permisos';
import { ErrorApi } from './errores';

/** ¿La lista de permisos incluye este par recurso × acción? */
export const cumple = (permisos: readonly Permiso[], p: Permiso): boolean =>
  permisos.some((x) => x.recurso === p.recurso && x.accion === p.accion);

/** ¿Puede abrir la pantalla? Inicio y Mi perfil solo piden sesión (SDD S1.11 §2.2). */
export const puedeAbrirRuta = (permisos: readonly Permiso[], id: IdMenu): boolean =>
  id === 'inicio' || id === 'perfil' ? true : cumple(permisos, PERMISO_RUTA[id]);

/** Ítems del menú lateral que corresponden a estos permisos, en el orden de MENU. */
export const itemsDelMenu = (permisos: readonly Permiso[]): ItemMenu[] =>
  MENU.filter((m) => puedeAbrirRuta(permisos, m.id));

/**
 * 403 de la API por falta de permiso (SDD S1.11 §2.5). El de cambio de contraseña pendiente no cuenta:
 * lo resuelve la sesión (S1.10).
 */
export const esAccesoDenegado = (e: unknown): boolean =>
  e instanceof ErrorApi && e.estado === 403 && e.codigo !== 'CAMBIO_PASSWORD_REQUERIDO';

/**
 * ¿Se puede volver a esta ruta tras el login? Si la sesión anterior era de otra persona, su pantalla puede no
 * corresponderle (daría 403). Se mira la sección del menú que la contiene; una ruta fuera del menú se deja pasar.
 */
export const puedeVolverA = (permisos: readonly Permiso[], ruta: string): boolean => {
  const seccion = MENU.filter((m) => m.ruta && (ruta === m.ruta || ruta.startsWith(`${m.ruta}/`))).sort(
    (a, b) => b.ruta.length - a.ruta.length,
  )[0];
  return !seccion || puedeAbrirRuta(permisos, seccion.id);
};
