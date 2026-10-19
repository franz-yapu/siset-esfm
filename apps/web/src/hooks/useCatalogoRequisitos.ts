import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogoRequisitosService } from '@/services/catalogoRequisitos.service';
import { avisarCambio } from './index';
import { claveFiles } from './useFiles';

// TanStack Query para "Requisitos por modalidad" (DEC-055).

export const claveCatalogoRequisitos = ['catalogo-requisitos'] as const;

export const useCatalogoRequisitos = () =>
  useQuery({ queryKey: claveCatalogoRequisitos, queryFn: () => catalogoRequisitosService.listar() });

/** Al cambiar el catálogo cambian los requisitos y el semáforo de los files: se invalidan los dos. */
export function useMutacionCatalogo<A, R>(fn: (a: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      avisarCambio();
      await Promise.all([
        cliente.invalidateQueries({ queryKey: claveCatalogoRequisitos }),
        cliente.invalidateQueries({ queryKey: claveFiles }),
        // Los conteos de requisitos por modalidad (pestaña "Modalidades").
        cliente.invalidateQueries({ queryKey: ['modalidades'] }),
      ]);
    },
  });
}
