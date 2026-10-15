import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Usuario } from '@/types';
import type { FiltrosHojasRuta } from '@/types/hojas-ruta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { avisarCambio } from './index';

// TanStack Query para P-30, P-31 y P-32 (SDD S3.8-S3.9 §2.3). Capa fina encima de hojasRutaService.

export const claveHojasRuta = ['hojas-ruta'] as const;

export const useHojasRuta = (filtros: FiltrosHojasRuta) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'lista', filtros],
    queryFn: () => hojasRutaService.listar(filtros),
    placeholderData: keepPreviousData,
  });

export const useHojaRuta = (nro: string, actor: Usuario) =>
  useQuery({
    queryKey: [...claveHojasRuta, 'una', nro, actor.id],
    queryFn: () => hojasRutaService.obtener(nro, actor),
    enabled: Boolean(nro),
    retry: false,
  });

/** El catálogo no cambia durante la sesión. */
export const useTiposTramite = () =>
  useQuery({ queryKey: ['tipos-tramite'], queryFn: () => hojasRutaService.tipos(), staleTime: Infinity });

/** Crear o mover: al terminar bien invalida la lista y el detalle, y avisa del cambio (la campana). */
export function useMutacionHojasRuta<A, R>(fn: (a: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      avisarCambio();
      await cliente.invalidateQueries({ queryKey: claveHojasRuta });
    },
  });
}
