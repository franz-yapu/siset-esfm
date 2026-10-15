import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { EstadoTramite, Rol } from '@/types';
import { ESTADOS } from '@/config/estados';
import { ROLES } from '@/config/permisos';
import { ESTADOS_HR } from '@/config/estados-hoja-ruta';
import type { EstadoHojaRuta } from '@/types/hojas-ruta';

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        className ?? 'bg-slate-100 text-slate-700 ring-slate-300',
      )}
    >
      {children}
    </span>
  );
}

export function EstadoBadge({ estado, className }: { estado: EstadoTramite; className?: string }) {
  return <Badge className={clsx(ESTADOS[estado].badge, className)}>{ESTADOS[estado].etiqueta}</Badge>;
}

/** Estados de la hoja de ruta de la API (ADR-0005). */
export function EstadoHojaRutaBadge({ estado, className }: { estado: EstadoHojaRuta; className?: string }) {
  return <Badge className={clsx(ESTADOS_HR[estado].badge, className)}>{ESTADOS_HR[estado].etiqueta}</Badge>;
}

export function RolBadge({ rol }: { rol: Rol }) {
  return <Badge className={ROLES[rol].badge}>{ROLES[rol].nombre}</Badge>;
}
