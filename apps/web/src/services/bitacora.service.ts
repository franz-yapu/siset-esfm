import { usaApi } from './_modo';
import { bitacoraApi, type ServicioBitacora } from './bitacora.api';
import { bitacoraMock } from './bitacora.mock';

/** Mock o API según VITE_USAR_API, con el contrato de la API en los dos modos (SDD S6.5 §2.1). */
export const bitacoraService: ServicioBitacora = usaApi('bitacora') ? bitacoraApi : bitacoraMock;
