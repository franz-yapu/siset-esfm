import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  CambiosUsuario,
  DatosCrearUsuario,
  FiltrosUsuarios,
  UsuarioConPassword,
  UsuarioDetalle,
} from '@/types/usuarios';
import { api } from '@/lib/api';
import type { ServicioUsuarios } from './usuarios.service';

/** Quita los filtros vacíos: la API pide `texto` de al menos 1 carácter. */
const parametros = (f: FiltrosUsuarios): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries({ ...f, texto: f.texto?.trim() }).filter(
      (e): e is [string, string | number] => e[1] !== undefined && e[1] !== '',
    ),
  );

const accion = async (id: number, verbo: string): Promise<UsuarioDetalle> =>
  (await api.post<UsuarioDetalle>(`/usuarios/${id}/${verbo}`)).data;

/**
 * usuariosService contra la API de S1.8. Las respuestas ya tienen la forma de
 * los tipos, y los errores llegan como `ErrorApi` por el interceptor de `lib/api.ts`.
 * El autor de cada acción sale del token: `actor` no se usa.
 */
export const usuariosApi: ServicioUsuarios = {
  async listar(f: FiltrosUsuarios): Promise<Pagina<UsuarioDetalle>> {
    return (await api.get<Pagina<UsuarioDetalle>>('/usuarios', { params: parametros(f) })).data;
  },

  async obtener(id: number): Promise<UsuarioDetalle> {
    return (await api.get<UsuarioDetalle>(`/usuarios/${id}`)).data;
  },

  async crear(d: DatosCrearUsuario, _actor: Usuario): Promise<UsuarioConPassword> {
    void _actor;
    return (await api.post<UsuarioConPassword>('/usuarios', d)).data;
  },

  async editar(id: number, c: CambiosUsuario, _actor: Usuario): Promise<UsuarioDetalle> {
    void _actor;
    return (await api.patch<UsuarioDetalle>(`/usuarios/${id}`, c)).data;
  },

  darDeBaja: (id) => accion(id, 'baja'),
  reactivar: (id) => accion(id, 'reactivar'),
  desbloquear: (id) => accion(id, 'desbloquear'),

  async restablecerPassword(id: number): Promise<UsuarioConPassword> {
    return (await api.post<UsuarioConPassword>(`/usuarios/${id}/restablecer-password`)).data;
  },
};
