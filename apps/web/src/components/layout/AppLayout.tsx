import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAuth, useUsuario } from '@/hooks';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumb } from './Breadcrumb';

/** Layout común de las pantallas internas (SPEC §4.3). */
export function AppLayout() {
  const usuario = useUsuario();
  const { version } = useAuth();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar usuario={usuario} abierto={menu} onCerrar={() => setMenu(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header usuario={usuario} onMenu={() => setMenu(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
          <Breadcrumb rol={usuario.rol} />
          {/* Cambiar de usuario o reiniciar la demo remonta la pantalla para recargar sus datos. */}
          <Outlet key={`${usuario.id}-${version}-${pathname}`} />
        </main>
      </div>
    </div>
  );
}
