import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type Color = 'azul' | 'verde' | 'ambar' | 'rojo' | 'violeta' | 'gris';

const COLORES: Record<Color, string> = {
  azul: 'bg-sky-50 text-acento',
  verde: 'bg-green-50 text-green-600',
  ambar: 'bg-amber-50 text-amber-600',
  rojo: 'bg-red-50 text-red-600',
  violeta: 'bg-violet-50 text-violet-600',
  gris: 'bg-slate-100 text-slate-600',
};

interface Props {
  titulo: string;
  valor: number | string;
  icono: LucideIcon;
  color?: Color;
  to?: string;
  detalle?: string;
}

export function KpiCard({ titulo, valor, icono: Icono, color = 'azul', to, detalle }: Props) {
  const cuerpo = (
    <>
      <span className={clsx('flex size-10 shrink-0 items-center justify-center rounded-lg', COLORES[color])}>
        <Icono className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{valor}</p>
        <p className="text-sm text-slate-500">{titulo}</p>
        {detalle && <p className="text-xs text-slate-400">{detalle}</p>}
      </div>
    </>
  );
  const clase = 'flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm';
  return to ? (
    <Link
      to={to}
      className={clsx(
        clase,
        'transition hover:border-acento hover:shadow-md focus-visible:outline-2 focus-visible:outline-acento',
      )}
    >
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}
