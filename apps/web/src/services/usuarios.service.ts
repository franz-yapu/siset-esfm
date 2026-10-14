import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  CambiosUsuario,
  DatosCrearUsuario,
  FiltrosUsuarios,
  UsuarioConPassword,
  UsuarioDetalle,
} from '@/types/usuarios';
import { usaApi } from './_modo';
import { usuariosApi } from './usuarios.api';
import { usuariosMock } from './usuarios.mock';

/**
 * Contrato de /api/v1/usuarios (SDD S1.8 §2.1). `actor` lo usa solo el mock
 * (bitácora de la demo y "sobre sí mismo"); la API toma el autor del token.
 */
export interface ServicioUsuarios {
  listar(f: FiltrosUsuarios): Promise<Pagina<UsuarioDetalle>>;
  obtener(id: number): Promise<UsuarioDetalle>;
  crear(d: DatosCrearUsuario, actor: Usuario): Promise<UsuarioConPassword>;
  editar(id: number, c: CambiosUsuario, actor: Usuario): Promise<UsuarioDetalle>;
  darDeBaja(id: number, actor: Usuario): Promise<UsuarioDetalle>;
  reactivar(id: number, actor: Usuario): Promise<UsuarioDetalle>;
  restablecerPassword(id: number, actor: Usuario): Promise<UsuarioConPassword>;
  desbloquear(id: number, actor: Usuario): Promise<UsuarioDetalle>;
}

/**
 * Mock o API según VITE_USAR_API (SDD S0.8 §2.3, S1.13 §2.2). Las pantallas importan solo esto.
 * La API pide el token de la sesión: usar `auth,usuarios` o `true`, nunca `usuarios` solo.
 */
export const usuariosService: ServicioUsuarios = usaApi('usuarios') ? usuariosApi : usuariosMock;
