import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FiltrosUsuarios } from '@/types/usuarios';
import { usuariosService } from '@/services/usuarios.service';
import { avisarCambio } from './index';

// TanStack Query para P-47 (SDD S1.13 §2.5). Capa fina encima de usuariosService.

export const claveUsuarios = ['usuarios'] as const;

/** Página de usuarios; mientras llega la siguiente se mantiene la anterior. */
export const useUsuarios = (filtros: FiltrosUsuarios) =>
  useQuery({
    queryKey: [...claveUsuarios, filtros],
    queryFn: () => usuariosService.listar(filtros),
    placeholderData: keepPreviousData,
  });

/**
 * Una mutación que, al terminar bien, invalida la lista y avisa del cambio (la
 * campana del header). La contraseña temporal que devuelven crear y restablecer
 * no se queda en caché: `gcTime: 0` borra la mutación apenas nadie la observa, y
 * quien la muestra llama `reset()` al cerrar (§2.4).
 */
export function useMutacionUsuarios<A, R>(fn: (a: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    gcTime: 0,
    onSuccess: async () => {
      avisarCambio();
      await cliente.invalidateQueries({ queryKey: claveUsuarios });
    },
  });
}
