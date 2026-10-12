import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { rutaInicio } from '@/config/permisos';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Cargando } from '@/components/ui';
import { Login } from '@/pages/publicas/Login';
import { Seguimiento } from '@/pages/publicas/Seguimiento';
import { CambiarClave } from '@/pages/publicas/CambiarClave';
import { NoEncontrado } from '@/pages/publicas/NoAutorizado';
import { MiPerfil } from '@/pages/perfil/MiPerfil';
import { InicioEstudiante } from '@/pages/inicio/InicioEstudiante';
import { InicioEgresado } from '@/pages/inicio/InicioEgresado';
import { InicioSecDir } from '@/pages/inicio/InicioSecDir';
import { InicioSecCoord } from '@/pages/inicio/InicioSecCoord';
import { InicioCoordinador } from '@/pages/inicio/InicioCoordinador';
import { InicioKardex } from '@/pages/inicio/InicioKardex';
import { EnConstruccion } from '@/pages/EnConstruccion';

/** Ruta protegida por el permiso de config/permisos.ts (si no lo tiene: P-04). */
const P = (permiso: string, el: ReactNode) => <ProtectedRoute permiso={permiso}>{el}</ProtectedRoute>;

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
      <Route path="/cambiar-clave" element={<ProtectedRoute><CambiarClave /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/estudiante" element={<Inicio rol="ESTUDIANTE"><InicioEstudiante /></Inicio>} />
        <Route path="/egresado" element={<Inicio rol="EGRESADO"><InicioEgresado /></Inicio>} />
        <Route path="/sec-dir" element={<Inicio rol="SEC_DIR"><InicioSecDir /></Inicio>} />
        <Route path="/sec-coord" element={<Inicio rol="SEC_COORD"><InicioSecCoord /></Inicio>} />
        <Route path="/coordinador" element={<Inicio rol="COORDINADOR"><InicioCoordinador /></Inicio>} />
        <Route path="/kardex" element={<Inicio rol="KARDEX"><InicioKardex /></Inicio>} />
        <Route path="/perfil" element={<MiPerfil />} />

        <Route path="/mi-file" element={P('mi-file', <EnConstruccion />)} />
        <Route path="/mis-tramites" element={P('mis-tramites', <EnConstruccion />)} />
        <Route path="/mis-tramites/:nro" element={P('mis-tramites', <EnConstruccion />)} />

        <Route path="/hojas-ruta/nueva" element={P('nueva-hr', <EnConstruccion />)} />
        <Route path="/hojas-ruta" element={P('hojas-ruta', <EnConstruccion />)} />
        <Route path="/hojas-ruta/:nro" element={P('detalle-hr', <EnConstruccion />)} />
        <Route path="/pases" element={P('pases', <EnConstruccion />)} />
        <Route path="/entregas" element={P('entregas', <EnConstruccion />)} />

        <Route path="/files" element={P('files', <EnConstruccion />)} />
        <Route path="/files/nuevo" element={P('form-file', <EnConstruccion />)} />
        <Route path="/files/:id" element={P('detalle-file', <EnConstruccion />)} />
        <Route path="/files/:id/editar" element={P('form-file', <EnConstruccion />)} />
        <Route path="/revision" element={P('revision', <EnConstruccion />)} />
        <Route path="/emision" element={P('emision', <EnConstruccion />)} />
        <Route path="/carga-masiva" element={P('carga', <EnConstruccion />)} />
        <Route path="/usuarios" element={P('usuarios', <EnConstruccion />)} />
        <Route path="/bitacora" element={P('bitacora', <EnConstruccion />)} />

        <Route path="/dictamenes" element={P('dictamenes', <EnConstruccion />)} />
        <Route path="/dictamenes/:nro" element={P('emitir-dictamen', <EnConstruccion />)} />
        <Route path="/reportes" element={P('reportes', <EnConstruccion />)} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
      {/* La carátula se imprime sin layout. */}
      <Route path="/hojas-ruta/:nro/caratula" element={P('caratula', <EnConstruccion />)} />
    </Routes>
  );
}
