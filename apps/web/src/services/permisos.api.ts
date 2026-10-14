import type { Rol, Usuario } from '@/types';
import { api } from '@/lib/api';
import { ACCIONES, RECURSOS, type Permiso } from '@/config/permisos';

export interface MisPermisos {
  rol: Rol;
  permisos: Permiso[];
}

interface RespuestaMisPermisos {
  rol: Rol;
  permisos?: { recurso: string; accion: string }[];
}

const esPermiso = (p: { recurso: string; accion: string }): p is Permiso =>
  (RECURSOS as readonly string[]).includes(p.recurso) && (ACCIONES as readonly string[]).includes(p.accion);

/** GET /auth/mis-permisos (SDD S1.6 §2.5). El rol sale del token; los pares que la web no conoce se ignoran. */
export const permisosApi = {
  async misPermisos(_u: Usuario): Promise<MisPermisos> {
    void _u;
    const { data } = await api.get<RespuestaMisPermisos>('/auth/mis-permisos');
    const permisos = Array.isArray(data.permisos) ? data.permisos : [];
    return {
      rol: data.rol,
      permisos: permisos.filter(esPermiso).map(({ recurso, accion }) => ({ recurso, accion })),
    };
  },
};
