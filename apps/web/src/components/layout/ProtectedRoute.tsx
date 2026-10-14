import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, usePermisos } from '@/hooks';
import type { IdRuta } from '@/config/permisos';
import { Alerta, Button, Cargando } from '@/components/ui';
import { NoAutorizado } from '@/pages/publicas/NoAutorizado';

/** Exige el permiso de la ruta según mis-permisos (SDD S1.11 §2.4): sin él, P-04 en la misma URL. */
function ConPermiso({ permiso, children }: { permiso: IdRuta; children: ReactNode }) {
  const { cargando, error, reintentar, puedeAbrir } = usePermisos();
  if (cargando) return <Cargando />;
  if (error) {
    // Se falla cerrado: sin permisos no se abre ninguna pantalla protegida.
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Alerta
          tipo="error"
          titulo={error}
          accion={
            <Button size="sm" variant="secondary" onClick={reintentar}>
              Reintentar
            </Button>
          }
        >
          Revise su conexión e intente de nuevo.
        </Alerta>
      </div>
    );
  }
  if (!puedeAbrir(permiso)) return <NoAutorizado />;
  return <>{children}</>;
}

/** Exige sesión; si se pasa `permiso`, exige además que el rol lo tenga en la política. */
export function ProtectedRoute({ permiso, children }: { permiso?: IdRuta; children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const loc = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: loc.pathname }} />;
  if (usuario.debeCambiarClave && loc.pathname !== '/cambiar-clave') return <Navigate to="/cambiar-clave" replace />;
  if (!permiso) return <>{children}</>;
  return <ConPermiso permiso={permiso}>{children}</ConPermiso>;
}
