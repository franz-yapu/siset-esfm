import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAuth, useUsuario } from '@/hooks';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/**
 * Layout común de las pantallas internas (SPEC §4.3). El menú y la barra superior forman un marco en L sobre el tono
 * del fondo; la pantalla va en una hoja blanca separada 8px del borde derecho e inferior, con borde fino y sin
 * sombra. En celular la hoja ocupa toda la pantalla.
 */
export function AppLayout() {
  const usuario = useUsuario();
  const { version } = useAuth();
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen bg-marco">
      <Sidebar usuario={usuario} abierto={menu} onCerrar={() => setMenu(false)} />
      <div className="flex min-w-0 flex-1 flex-col lg:pr-2 lg:pb-2">
        <Header usuario={usuario} onMenu={() => setMenu(true)} />
        <main className="flex-1 bg-white lg:rounded-2xl lg:border lg:border-borde">
          <div className="mx-auto w-full max-w-7xl px-4 pt-5 pb-10 sm:px-6 lg:pt-6">
            {/* Cambiar de usuario o reiniciar la demo remonta la pantalla para recargar sus datos. */}
            <Outlet key={`${usuario.id}-${version}-${pathname}`} />
          </div>
        </main>
      </div>
    </div>
  );
}
