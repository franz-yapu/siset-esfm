import { inject } from 'vitest';
import { crearClienteBd, type ClienteBd } from '@/compartido/bd';

/** Cliente sobre la base temporal que creó `preparar-bd.ts` para esta corrida. */
export function clienteDeTest(): ClienteBd {
  return crearClienteBd(inject('urlBdTest'));
}

/** Valores de prueba, solo para la base de test. */
export const KARDEX_DE_PRUEBA = { ci: '9000001', password: 'prueba1234', nombres: 'Kardex', apellidos: 'Prueba' };
