import { usaApi } from './_modo';
import { authApi } from './auth.api';
import { authMock } from './auth.mock';

/** Mock o API según VITE_USAR_API (SDD S0.8 §2.3). Las pantallas importan solo esto. */
export const authService: typeof authMock = usaApi('auth') ? authApi : authMock;
