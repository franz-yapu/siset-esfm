import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogoModalidadesService } from '@/services/catalogoModalidades.service';
import { avisarCambio } from './index';
import { claveCatalogoRequisitos } from './useCatalogoRequisitos';

// TanStack Query para el catálogo de modalidades de ingreso (DEC-058).

export const claveModalidades = ['modalidades'] as const;

/** Las activas: el formulario del file y las columnas de "Requisitos por modalidad". */
export const useModalidades = () =>
  useQuery({ queryKey: [...claveModalidades, 'activas'], queryFn: () => catalogoModalidadesService.activas() });

/** Todo el catálogo, con las dadas de baja (pestaña "Modalidades" de Kardex). */
export const useModalidadesAdmin = () =>
  useQuery({ queryKey: [...claveModalidades, 'todas'], queryFn: () => catalogoModalidadesService.listar() });

/** Cambiar una modalidad cambia las columnas y los conteos de requisitos: se invalidan los dos catálogos. */
export function useMutacionModalidades<A, R>(fn: (a: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      avisarCambio();
      await Promise.all([
        cliente.invalidateQueries({ queryKey: claveModalidades }),
        cliente.invalidateQueries({ queryKey: claveCatalogoRequisitos }),
      ]);
    },
  });
}
