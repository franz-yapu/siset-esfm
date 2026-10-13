import type { Usuario } from '@/types';
import { api } from '@/lib/api';
import { ErrorApi } from '@/lib/errores';
import type { authMock } from './auth.mock';

const pendienteS1 = (que: string) =>
  new ErrorApi(`${que} todavía no está disponible en la API (llega en S1.x).`, 'NO_IMPLEMENTADO');

/**
 * authService contra la API (SDD S0.8 §2.4). Solo implementa lo que define el
 * PRD §5; el contrato exacto lo confirma el SDD de S1.3.
 */
export const authApi: typeof authMock = {
  async login(usuario: string, clave: string): Promise<Usuario> {
    const { data } = await api.post<Usuario>('/auth/login', { usuario, clave });
    return data;
  },

  async logout(_u: Usuario): Promise<void> {
    void _u;
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
