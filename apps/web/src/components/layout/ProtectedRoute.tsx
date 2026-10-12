import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { puedeVer } from '@/config/permisos';
import { Cargando } from '@/components/ui';
import { NoAutorizado } from '@/pages/publicas/NoAutorizado';

/** Exige sesión; si se pasa `permiso`, exige además que el rol lo tenga (si no, P-04 · 403). */
export function ProtectedRoute({ permiso, children }: { permiso?: string; children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const loc = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: loc.pathname }} />;
  if (usuario.debeCambiarClave && loc.pathname !== '/cambiar-clave') return <Navigate to="/cambiar-clave" replace />;
  if (permiso && !puedeVer(usuario.rol, permiso)) return <NoAutorizado />;
  return <>{children}</>;
}
