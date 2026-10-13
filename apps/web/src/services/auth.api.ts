import type { Rol, Usuario } from '@/types';
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import { borrarAccessToken, guardarAccessToken } from '@/lib/sesion';
import type { authMock } from './auth.mock';

const pendienteS1 = (que: string) =>
  new ErrorApi(`${que} todavía no está disponible en la API (llega en S1.x).`, 'NO_IMPLEMENTADO');

/** Respuesta de POST /auth/login (SDD S1.3 §2.1). */
export interface RespuestaLogin {
  accessToken: string;
  expiraEn: string;
  usuario: {
    id: number;
    usuario: string;
    nombre: string;
    rol: Rol;
    sedeId: number | null;
    activo: boolean;
    debeCambiarPassword: boolean;
    ultimoAcceso: string | null;
  };
}

/** Traduce el usuario de la API al `Usuario` que ya usan las pantallas. */
const aUsuario = ({ debeCambiarPassword, ultimoAcceso, ...u }: RespuestaLogin['usuario']): Usuario => ({
  ...u,
  debeCambiarClave: debeCambiarPassword,
  ...(ultimoAcceso ? { ultimoAcceso } : {}),
});

/**
 * authService contra la API (SDD S0.8 §2.4, contrato de S1.3). Solo implementa
 * lo que define el PRD §5.
 */
export const authApi: typeof authMock = {
  async login(usuario: string, clave: string): Promise<Usuario> {
    // `password`, no `clave`: así lo tapa la redacción de logs y bitácora (DEC-011).
    const { data } = await api.post<RespuestaLogin>('/auth/login', { usuario, password: clave });
    guardarAccessToken(data.accessToken);
    return aUsuario(data.usuario);
  },

  async logout(_u: Usuario): Promise<void> {
    void _u;
    borrarAccessToken();
    await api.post('/auth/logout');
  },

  async obtener(_id: number): Promise<Usuario | null> {
    void _id;
    throw pendienteS1('Restaurar la sesión');
  },

  async cambiarClave(_u: Usuario, _nueva: string): Promise<void> {
    void _u;
    void _nueva;
    throw pendienteS1('Cambiar la contraseña');
  },

  usuariosDemo(): Usuario[] {
    return [];
  },
};
