import { QueryClient } from '@tanstack/react-query';
import { ErrorApi } from './errores';

/** Solo se reintenta lo que puede mejorar solo: red caída o error del servidor (SDD S0.8 §2.5). */
export const debeReintentar = (intentos: number, error: unknown): boolean => {
  if (intentos >= 1) return false;
  if (!(error instanceof ErrorApi)) return false;
  return error.estado === undefined || error.estado >= 500;
};

export const crearQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: debeReintentar, refetchOnWindowFocus: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
