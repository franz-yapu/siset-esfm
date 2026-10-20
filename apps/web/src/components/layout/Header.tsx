import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, ChevronDown, LogOut, Menu, RotateCcw, UserCircle } from 'lucide-react';
import type { Usuario } from '@/types';
import { useAuth, useToast } from '@/hooks';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { ROLES, rutaInicio } from '@/config/permisos';
import { authService } from '@/services/auth.service';
import { iniciales, primerNombre } from '@/lib/formato';
import { todoMock } from '@/services/_modo';
import { Breadcrumb } from './Breadcrumb';

/** La demo (usuarios de prueba, "Ver como", reinicio) solo existe con todos los servicios en mock (SDD S0.8 §2.5). */
const DEMO = import.meta.env.VITE_DEMO === 'true' && todoMock();

/** Cierra un menú desplegable al hacer clic fuera. */
function useFuera(abierto: boolean, cerrar: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const f = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) cerrar();
    };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [abierto, cerrar]);
  return ref;
}

export function Header({ usuario, onMenu }: { usuario: Usuario; onMenu: () => void }) {
  const { logout, verComo, reiniciar } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const [campana, setCampana] = useState(false);
  const refMenu = useFuera(menu, () => setMenu(false));
  const refCampana = useFuera(campana, () => setCampana(false));
  const avisos = useNotificaciones(usuario);

  const cambiarRol = async (id: number) => {
    await verComo(id);
    const u = authService.usuariosDemo().find((x) => x.id === id);
    if (u) nav(rutaInicio(u.rol));
  };

  return (
    // Barra blanca: en escritorio lleva la ruta de navegación; en celular, el menú y el nombre.
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-borde bg-white px-3 sm:px-4">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-md p-2 text-suave hover:bg-activo lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>
      <Link to={rutaInicio(usuario.rol)} className="min-w-0 truncate font-semibold text-primario lg:hidden">
        SISET <span className="font-normal text-suave">· UA Ancocagua</span>
      </Link>
      <Breadcrumb rol={usuario.rol} className="hidden lg:flex" />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {DEMO && (
          <label className="flex h-8 items-center gap-1.5 rounded-md border border-control bg-white px-2 text-[13px] text-suave">
            <span className="hidden sm:inline">Ver como</span>
            <select
              value={usuario.id}
              onChange={(e) => cambiarRol(Number(e.target.value))}
              aria-label="Ver como"
              className="max-w-28 bg-transparent font-medium text-tinta focus:outline-none sm:max-w-none"
            >
              {authService.usuariosDemo().map((u) => (
                <option key={u.id} value={u.id}>
                  {ROLES[u.rol].nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <div ref={refCampana} className="relative">
          <button
            type="button"
            onClick={() => setCampana(!campana)}
            className="relative rounded-md p-2 text-suave hover:bg-activo"
            aria-label={`Alertas (${avisos.length})`}
            aria-expanded={campana}
          >
            <Bell className="size-5" />
            {avisos.length > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c4242a] px-1 text-[11px] leading-none font-medium text-white tabular-nums">
                {avisos.length}
              </span>
            )}
          </button>
          {campana && (
            <div className="absolute right-0 mt-2 w-72 rounded-[10px] border border-borde bg-white py-1 shadow-lg">
              <p className="px-3 py-2 text-[13px] font-medium text-suave">Alertas</p>
              {avisos.length === 0 ? (
                <p className="px-3 pb-3 text-sm text-suave">No tienes alertas pendientes.</p>
              ) : (
                avisos.map((a) => (
                  <Link
                    key={a.texto}
                    to={a.to}
                    onClick={() => setCampana(false)}
                    className="block px-3 py-2 text-sm text-tinta hover:bg-[#f5f7fa]"
                  >
                    {a.texto}
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <div ref={refMenu} className="relative">
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-activo"
            aria-expanded={menu}
            aria-label="Menú de usuario"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primario text-xs font-semibold text-white">
              {iniciales(usuario.nombre)}
            </span>
            <span className="hidden text-sm text-tinta md:inline">{primerNombre(usuario.nombre)}</span>
            <ChevronDown className="hidden size-4 text-suave md:inline" />
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-60 rounded-[10px] border border-borde bg-white py-1 shadow-lg">
              <div className="border-b border-regla px-3 py-2">
                <p className="truncate text-sm font-medium text-tinta">{usuario.nombre}</p>
                <p className="text-xs text-suave">{ROLES[usuario.rol].nombre}</p>
              </div>
              <Link
                to="/perfil"
                onClick={() => setMenu(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-tinta hover:bg-[#f5f7fa]"
              >
                <UserCircle className="size-4" />
                Mi perfil
              </Link>
              {DEMO && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                  onClick={async () => {
                    setMenu(false);
                    await reiniciar();
                    nav(rutaInicio(usuario.rol));
                    toast.success('Datos de demo reiniciados');
                  }}
                >
                  <RotateCcw className="size-4" />
                  Reiniciar datos de demo
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={async () => {
                  await logout();
                  nav('/login');
                }}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
