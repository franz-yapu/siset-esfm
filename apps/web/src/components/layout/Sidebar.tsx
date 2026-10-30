import { useEffect } from 'react';
import { NavLink } from 'react-router';
import { X } from 'lucide-react';
import clsx from 'clsx';
import type { Usuario } from '@/types';
import { ROLES, rutaInicio } from '@/config/permisos';
import { usePermisos } from '@/hooks';
import { itemsDelMenu } from '@/lib/permisos';
import { nombreSede } from '@/config/catalogos';
import { COMPILACION, VERSION } from '@/config/version';
import { NOMBRE_INSTITUCION } from '@/config/institucion';

interface Props {
  usuario: Usuario;
  abierto: boolean;
  onCerrar: () => void;
}

/**
 * Menú lateral verde (el primario); el ítem activo es una pastilla blanca: los ítems salen de mis-permisos (SDD S1.11 §2.4). Mientras cargan o si fallan, solo
 * Inicio y Mi perfil. En celular es un panel deslizable.
 */
export function Sidebar({ usuario, abierto, onCerrar }: Props) {
  const { permisos } = usePermisos();
  const items = itemsDelMenu(permisos);
  // En celular, Esc cierra el panel abierto, como las ventanas modales.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);
  return (
    <>
      <div
        aria-hidden
        onClick={onCerrar}
        className={clsx(
          'no-print fixed inset-0 z-30 bg-slate-900/40 transition-opacity lg:hidden',
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={clsx(
          'no-print fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-primario text-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          abierto ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Menú principal"
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <span className="text-lg font-semibold tracking-wide">SISET</span>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md p-1.5 text-emerald-100 hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>
        {/* El alcance: el puesto y la sede de quien trabaja. */}
        <div className="mx-4 mt-3 mb-3">
          <p className="text-sm font-medium text-white">{ROLES[usuario.rol].nombre}</p>
          <p className="text-[13px] text-emerald-100">
            {usuario.sedeId ? nombreSede(usuario.sedeId) : 'ESFM · UA Ancocagua'}
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <ul className="space-y-0.5">
            {items.map((m) => {
              const ruta = m.id === 'inicio' ? rutaInicio(usuario.rol) : m.ruta;
              return (
                <li key={m.id}>
                  <NavLink
                    to={ruta}
                    end={m.id === 'hojas-ruta' || m.id === 'inicio'}
                    onClick={onCerrar}
                    className={({ isActive }) =>
                      clsx(
                        'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-white',
                        isActive
                          ? 'bg-white font-medium text-primario'
                          : 'text-emerald-100 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <m.icono className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {m.etiqueta}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="border-t border-white/10 px-4 py-3 text-xs text-emerald-100">
          {NOMBRE_INSTITUCION}
          <span className="mt-1 block font-mono text-[11px] text-emerald-200/80" title={`Compilación ${COMPILACION}`}>
            {VERSION}
          </span>
        </p>
      </aside>
    </>
  );
}
