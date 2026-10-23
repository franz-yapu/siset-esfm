import type { Usuario } from '@/types';
import { usaApi } from './_modo';
import { permisosApi } from './permisos.api';
import { permisosMock } from './permisos.mock';

export type { MisPermisos } from './permisos.api';

/**
 * Mock o API según el modo de `auth` (SDD S1.11 §2.3): los permisos de la API exigen el token del
 * login real. Las pantallas importan solo esto.
 */
export const permisosService: typeof permisosMock = usaApi('auth') ? permisosApi : permisosMock;

/** La consulta de mis-permisos, compartida por `usePermisos` y el login, que la adelanta para no pintar el menú a medias. */
export const consultaPermisos = (u: Usuario) => ({
  queryKey: ['mis-permisos', u.id, u.rol] as const,
  queryFn: () => permisosService.misPermisos(u),
  staleTime: Infinity,
});
