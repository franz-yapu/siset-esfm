import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DatosRequisito } from '@/types/requisitos';
import type { Usuario } from '@/types';
import { requisitosService } from '@/services/requisitos.service';
import { avisarCambio } from './index';
import { claveFiles } from './useFiles';

// TanStack Query para la pestaña de requisitos de P-41 (SDD S2.4 §2.4).

export const useRequisitos = (fileId: number, habilitado = true) =>
  useQuery({
    queryKey: [...claveFiles, 'requisitos', fileId],
    queryFn: () => requisitosService.listar(fileId),
    enabled: habilitado && fileId > 0,
  });

/** Los requisitos del file del estudiante (S2.7). */
export const useMisRequisitos = (actor: Usuario, habilitado = true) =>
  useQuery({
    queryKey: [...claveFiles, 'requisitos', 'mios', actor.id],
    queryFn: () => requisitosService.mios(actor),
    enabled: habilitado,
  });

/** Las entregas de requisitos del file (SDD OBS-T1, #3); comparten clave con el file: registrar las refresca. */
export const useEntregas = (fileId: number, habilitado = true) =>
  useQuery({
    queryKey: [...claveFiles, 'entregas', fileId],
    queryFn: () => requisitosService.entregas(fileId),
    enabled: habilitado && fileId > 0,
  });

/** Las del estudiante. */
export const useMisEntregas = (actor: Usuario, habilitado = true) =>
  useQuery({
    queryKey: [...claveFiles, 'entregas', 'mias', actor.id],
    queryFn: () => requisitosService.misEntregas(actor),
    enabled: habilitado,
  });

/** Registrar invalida todo lo del file (requisitos e historial). */
export function useRegistrarRequisito(fileId: number, actor: Usuario) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, datos }: { codigo: string; datos: DatosRequisito }) =>
      requisitosService.registrar(fileId, codigo, datos, actor),
    onSuccess: async () => {
      avisarCambio();
      await cliente.invalidateQueries({ queryKey: claveFiles });
    },
  });
}
