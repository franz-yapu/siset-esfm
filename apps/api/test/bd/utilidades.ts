import { inject } from 'vitest';
import { crearClienteBd, type ClienteBd } from '@/compartido/bd';
import type { KardexInicial } from '../../prisma/semilla';

/** Cliente sobre la base temporal que creó `preparar-bd.ts` para esta corrida. */
export function clienteDeTest(): ClienteBd {
  return crearClienteBd(inject('urlBdTest'));
}

/** Valores de prueba, solo para la base de test. */
export const KARDEX_DE_PRUEBA: KardexInicial = {
  ci: '9000001',
  complemento: '',
  password: 'prueba-1234',
  nombres: 'Kardex',
  apellidoPaterno: 'Prueba',
  apellidoMaterno: null,
  sede: 'ANCOCAGUA',
};
