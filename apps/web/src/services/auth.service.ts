import type { Usuario } from '@/types';
import { usaApi } from './_modo';
import { authApi } from './auth.api';
import { authMock } from './auth.mock';

/** El login lleva además el captcha (ADR-0012); la demo no tiene captcha y lo ignora. */
type ServicioAuth = Omit<typeof authMock, 'login'> & {
  login(usuario: string, password: string, captcha?: string): Promise<Usuario>;
};

/** Mock o API según VITE_USAR_API (SDD S0.8 §2.3). Las pantallas importan solo esto. */
export const authService: ServicioAuth = usaApi('auth') ? authApi : authMock;
