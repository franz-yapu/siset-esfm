import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from '@/hooks';
import { rutaInicio, type IdRuta } from '@/config/permisos';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Cargando } from '@/components/ui';
import { Login } from '@/pages/publicas/Login';
import { Seguimiento } from '@/pages/publicas/Seguimiento';
import { CambiarClave } from '@/pages/publicas/CambiarClave';
import { NoEncontrado } from '@/pages/publicas/NoAutorizado';
import { MiPerfil } from '@/pages/perfil/MiPerfil';
import { InicioEstudiante } from '@/pages/inicio/InicioEstudiante';
import { InicioSecDir } from '@/pages/inicio/InicioSecDir';
import { InicioSecCoord } from '@/pages/inicio/InicioSecCoord';
import { InicioCoordinador } from '@/pages/inicio/InicioCoordinador';
import { InicioKardex } from '@/pages/inicio/InicioKardex';
import { MiFile } from '@/pages/estudiante/MiFile';
import { NuevaHojaRuta } from '@/pages/hojas-ruta/NuevaHojaRuta';
import { HojasRuta } from '@/pages/hojas-ruta/HojasRuta';
import { DetalleHojaRuta } from '@/pages/hojas-ruta/DetalleHojaRuta';
import { Caratula } from '@/pages/hojas-ruta/Caratula';
import { BandejaPases } from '@/pages/pases/BandejaPases';
import { FirmaEntrega } from '@/pages/pases/FirmaEntrega';
import { Files } from '@/pages/kardex/Files';
import { DetalleFile } from '@/pages/kardex/DetalleFile';
import { FormFile } from '@/pages/kardex/FormFile';
import { Revision } from '@/pages/kardex/Revision';
import { Emision } from '@/pages/kardex/Emision';
import { CargaMasiva } from '@/pages/kardex/CargaMasiva';
import { Usuarios } from '@/pages/kardex/Usuarios';
import { Bitacora } from '@/pages/kardex/Bitacora';
import { Firmas } from '@/pages/coordinador/Firmas';
import { Reportes } from '@/pages/reportes/Reportes';
import { MisTramites, MiTramite } from '@/pages/estudiante/MisTramites';

/** Ruta protegida por el permiso de PERMISO_RUTA, según mis-permisos (si no lo tiene: P-04, SDD S1.11). */
const P = (permiso: IdRuta, el: ReactNode) => <ProtectedRoute permiso={permiso}>{el}</ProtectedRoute>;

/** Cada rol tiene su propio inicio; se protegen con el rol exacto. */
function Inicio({ rol, children }: { rol: string; children: ReactNode }) {
  const { usuario } = useAuth();
  if (usuario && usuario.rol !== rol) return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return <>{children}</>;
}

function Raiz() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  return <Navigate to={usuario ? rutaInicio(usuario.rol) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Raiz />} />
      <Route path="/login" element={<Login />} />
      <Route path="/seguimiento" element={<Seguimiento />} />
      <Route
        path="/cambiar-clave"
        element={
          <ProtectedRoute>
            <CambiarClave />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/estudiante"
          element={
            <Inicio rol="ESTUDIANTE">
              <InicioEstudiante />
            </Inicio>
          }
        />
        <Route
          path="/sec-dir"
          element={
            <Inicio rol="SEC_DIR">
              <InicioSecDir />
            </Inicio>
          }
        />
        <Route
          path="/sec-coord"
          element={
            <Inicio rol="SEC_COORD">
              <InicioSecCoord />
            </Inicio>
          }
        />
        <Route
          path="/coordinador"
          element={
            <Inicio rol="COORDINADOR">
              <InicioCoordinador />
            </Inicio>
          }
        />
        <Route
          path="/kardex"
          element={
            <Inicio rol="KARDEX">
              <InicioKardex />
            </Inicio>
          }
        />
        <Route path="/perfil" element={<MiPerfil />} />

        <Route path="/mi-file" element={P('mi-file', <MiFile />)} />
        <Route path="/mis-tramites" element={P('mis-tramites', <MisTramites />)} />
        <Route path="/mis-tramites/:nro" element={P('mis-tramites', <MiTramite />)} />

        <Route path="/hojas-ruta/nueva" element={P('nueva-hr', <NuevaHojaRuta />)} />
        <Route path="/hojas-ruta" element={P('hojas-ruta', <HojasRuta />)} />
        <Route path="/hojas-ruta/:nro" element={P('detalle-hr', <DetalleHojaRuta />)} />
        <Route path="/pases" element={P('pases', <BandejaPases />)} />
        <Route path="/entregas" element={P('entregas', <FirmaEntrega />)} />

        <Route path="/files" element={P('files', <Files />)} />
        <Route path="/files/nuevo" element={P('nuevo-file', <FormFile />)} />
        <Route path="/files/:id" element={P('detalle-file', <DetalleFile />)} />
        <Route path="/files/:id/editar" element={P('editar-file', <FormFile />)} />
        <Route path="/revision" element={P('revision', <Revision />)} />
        <Route path="/emision" element={P('emision', <Emision />)} />
        <Route path="/carga-masiva" element={P('carga', <CargaMasiva />)} />
        <Route path="/usuarios" element={P('usuarios', <Usuarios />)} />
        <Route path="/bitacora" element={P('bitacora', <Bitacora />)} />

        <Route path="/firmas" element={P('firmas', <Firmas />)} />
        <Route path="/reportes" element={P('reportes', <Reportes />)} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
      {/* La carátula se imprime sin layout. */}
      <Route path="/hojas-ruta/:nro/caratula" element={P('caratula', <Caratula />)} />
    </Routes>
  );
}
