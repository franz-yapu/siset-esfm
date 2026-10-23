import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth, usePermisos, useUsuario } from '@/hooks';
import { Cargando } from '@/components/ui';
import { rutaInicio } from '@/config/permisos';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/** Layout común de las pantallas internas (SPEC §4.3): menú azul, barra blanca con la ruta y el contenido. */
export function AppLayout() {
  const usuario = useUsuario();
  const { version } = useAuth();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  // Sin permisos todavía, el menú y la pantalla saldrían a medias: mejor una sola carga.
  const { cargando } = usePermisos();
  // Si cambia la persona («Ver como» o una sesión de otra cuenta en otra pestaña), la pantalla de la anterior no se
  // vuelve a evaluar con los permisos nuevos (daría 403): se va directo al inicio de quien entró.
  const [idDeLaRuta, setIdDeLaRuta] = useState(usuario.id);
  if (idDeLaRuta !== usuario.id) {
    if (pathname !== rutaInicio(usuario.rol)) return <Navigate to={rutaInicio(usuario.rol)} replace />;
    setIdDeLaRuta(usuario.id);
  }
  if (cargando) return <Cargando />;

  return (
    <div className="flex min-h-screen bg-fondo">
      <Sidebar usuario={usuario} abierto={menu} onCerrar={() => setMenu(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header usuario={usuario} onMenu={() => setMenu(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-10 sm:px-6 lg:pt-6">
          {/* Cambiar de usuario o reiniciar la demo remonta la pantalla para recargar sus datos. */}
          <Outlet key={`${usuario.id}-${version}-${pathname}`} />
        </main>
      </div>
    </div>
  );
}
