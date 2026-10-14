import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FiltrosFiles } from '@/types/files';
import { filesService } from '@/services/files.service';
import { avisarCambio } from './index';

// TanStack Query para P-40, P-41 y P-42 (SDD S2.9-S2.10 §2.2). Capa fina encima de filesService.

export const claveFiles = ['files'] as const;

/** Página de files; mientras llega la siguiente se mantiene la anterior. */
export const useFiles = (filtros: FiltrosFiles) =>
  useQuery({
    queryKey: [...claveFiles, 'lista', filtros],
    queryFn: () => filesService.listar(filtros),
    placeholderData: keepPreviousData,
  });

export const useFile = (id: number) =>
  useQuery({ queryKey: [...claveFiles, 'uno', id], queryFn: () => filesService.obtener(id), enabled: id > 0 });

/** El catálogo no cambia durante la sesión. */
export const useEspecialidades = () =>
  useQuery({ queryKey: ['especialidades'], queryFn: () => filesService.especialidades(), staleTime: Infinity });

/** Crear o editar: al terminar bien invalida las listas y el detalle, y avisa del cambio (la campana). */
export function useMutacionFiles<A, R>(fn: (a: A) => Promise<R>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      avisarCambio();
      await cliente.invalidateQueries({ queryKey: claveFiles });
    },
  });
}

/** Indicadores de files del inicio de Kardex: solo el `total` de cada consulta (S1.12 §2.1). */
export const useResumenFiles = () =>
  useQuery({
    queryKey: [...claveFiles, 'resumen'],
    queryFn: async () => {
      const [todos, bloqueados, rojos, atencion] = await Promise.all([
        filesService.listar({ porPagina: 1 }),
        filesService.listar({ bloqueado: true, porPagina: 1 }),
        filesService.listar({ semaforo: 'ROJO', porPagina: 1 }),
        filesService.listar({ semaforo: 'ROJO', porPagina: 20 }),
      ]);
      return { total: todos.total, bloqueados: bloqueados.total, rojos: rojos.total, atencion: atencion.datos };
    },
  });
