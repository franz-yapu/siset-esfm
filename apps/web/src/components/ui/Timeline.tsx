import clsx from 'clsx';
import { MapPin, User } from 'lucide-react';
import type { Movimiento } from '@/types';
import { ESTADOS } from '@/config/estados';
import { nombreSede } from '@/config/catalogos';
import { fechaHora } from '@/lib/formato';

/** Línea de tiempo vertical (HU-06). El último paso queda resaltado. */
export function Timeline({ movimientos, ocultarResponsable = false }: { movimientos: Movimiento[]; ocultarResponsable?: boolean }) {
  const lista = [...movimientos].reverse();
  return (
    <ol className="relative">
      {lista.map((m, i) => {
        const actual = i === 0;
        return (
          <li key={`${m.estado}-${m.fecha}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {i < lista.length - 1 && <span aria-hidden className="absolute top-5 left-[9px] h-full w-0.5 bg-slate-200" />}
            <span
              aria-hidden
              className={clsx('relative z-10 mt-0.5 size-5 shrink-0 rounded-full border-4 border-white', ESTADOS[m.estado].punto,
                actual && 'ring-4 ring-acento/25')}
            />
            <div className={clsx('min-w-0 flex-1 rounded-lg px-3 py-2', actual ? 'bg-sky-50 ring-1 ring-sky-200' : '')}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={clsx('text-sm', actual ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                  {ESTADOS[m.estado].etiqueta}{actual && <span className="ml-2 text-xs font-normal text-acento">Estado actual</span>}
                </p>
                <time className="text-xs text-slate-500">{fechaHora(m.fecha)}</time>
              </div>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{nombreSede(m.sedeId)}</span>
                {!ocultarResponsable && <span className="inline-flex items-center gap-1"><User className="size-3" aria-hidden />{m.usuario}</span>}
              </p>
              {m.obs && <p className="mt-1 text-xs text-slate-600 italic">“{m.obs}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
