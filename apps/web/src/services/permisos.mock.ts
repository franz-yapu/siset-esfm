import type { Usuario } from '@/types';
import { POLITICA_MOCK } from '@/mocks/politica';
import { delay } from '@/lib/formato';
import { LATENCIA } from './_comun';
import type { MisPermisos } from './permisos.api';

/** Permisos del rol del usuario según la copia de la política (SDD S1.11 §2.3). */
export const permisosMock = {
  async misPermisos(u: Usuario): Promise<MisPermisos> {
    await delay(LATENCIA);
    return {
      rol: u.rol,
      permisos: POLITICA_MOCK.filter(([rol]) => rol === u.rol).map(([, recurso, accion]) => ({ recurso, accion })),
    };
  },
};
