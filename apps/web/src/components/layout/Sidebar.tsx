import { NavLink } from 'react-router-dom';
import { MapPin, X } from 'lucide-react';
import clsx from 'clsx';
import type { Usuario } from '@/types';
import { MENU, ROLES, rutaInicio } from '@/config/permisos';
import { nombreSede } from '@/config/catalogos';

interface Props { usuario: Usuario; abierto: boolean; onCerrar: () => void }

/** Menú lateral azul, generado desde config/permisos.ts. En celular es un panel deslizable. */
export function Sidebar({ usuario, abierto, onCerrar }: Props) {
  const items = MENU.filter((m) => m.roles.includes(usuario.rol));
  return (
    <>
      <div aria-hidden onClick={onCerrar}
        className={clsx('no-print fixed inset-0 z-30 bg-slate-900/40 transition-opacity lg:hidden', abierto ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      <aside
        className={clsx('no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primario text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full')}
        aria-label="Menú principal"
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <span className="font-semibold tracking-wide">SISET</span>
          <button type="button" onClick={onCerrar} className="rounded p-1 hover:bg-white/10 lg:hidden" aria-label="Cerrar menú"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {items.map((m) => {
              const ruta = m.id === 'inicio' ? rutaInicio(usuario.rol) : m.ruta;
              return (
                <li key={m.id}>
                  <NavLink to={ruta} end={m.id === 'hojas-ruta' || m.id === 'inicio'} onClick={onCerrar}
                    className={({ isActive }) => clsx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive ? 'bg-white font-medium text-primario' : 'text-sky-100 hover:bg-white/10 hover:text-white')}>
                    <m.icono className="size-4 shrink-0" aria-hidden />
                    {m.etiqueta}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-sky-100">
          <p className="font-medium text-white">{ROLES[usuario.rol].nombre}</p>
          {usuario.sedeId && <p className="mt-0.5 flex items-center gap-1"><MapPin className="size-3" aria-hidden />Sede: {nombreSede(usuario.sedeId)}</p>}
        </div>
      </aside>
    </>
  );
}
