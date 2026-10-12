import { reset } from '@/mocks/db';

/** Botón "Reiniciar datos de demo". Desaparece cuando exista la API real. */
export const reiniciarDemo = (): void => reset();
