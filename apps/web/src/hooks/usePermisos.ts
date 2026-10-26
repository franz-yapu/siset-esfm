import { useCallback, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '@/context/AuthContext';
import type { IdMenu, Permiso } from '@/config/permisos';
import { cumple, puedeAbrirRuta } from '@/lib/permisos';
import { permisosService } from '@/services/permisos.service';

export interface ApiPermisos {
  /** Hay sesión y los permisos todavía no llegaron. */
  cargando: boolean;
  error: string | null;
  reintentar: () => void;
  /** Permisos del rol; vacío mientras cargan o si fallaron (se falla cerrado). */
  permisos: readonly Permiso[];
  puede: (p: Permiso) => boolean;
  puedeAbrir: (id: IdMenu) => boolean;
}

const SIN_PERMISOS: readonly Permiso[] = [];

/** Permisos del usuario de la sesión (SDD S1.11 §2.3): una consulta por sesión, de mis-permisos o del mock. */
export function usePermisos(): ApiPermisos {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('usePermisos fuera de AuthProvider');
  const { usuario } = ctx;
  const consulta = useQuery({
    queryKey: ['mis-permisos', usuario?.id, usuario?.rol],
    queryFn: () => {
      if (!usuario) throw new Error('Sin sesión');
      return permisosService.misPermisos(usuario);
    },
    enabled: Boolean(usuario),
    staleTime: Infinity,
    retryOnMount: false,
  });
  const permisos = consulta.data?.permisos ?? SIN_PERMISOS;
  const puede = useCallback((p: Permiso) => cumple(permisos, p), [permisos]);
  const puedeAbrir = useCallback((id: IdMenu) => puedeAbrirRuta(permisos, id), [permisos]);
  const { refetch } = consulta;
  const reintentar = useCallback(() => void refetch(), [refetch]);
  return {
    cargando: Boolean(usuario) && consulta.isPending,
    error: consulta.isError ? 'No se pudieron cargar tus permisos.' : null,
    reintentar,
    permisos,
    puede,
    puedeAbrir,
  };
}
