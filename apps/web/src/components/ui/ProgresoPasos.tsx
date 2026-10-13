import clsx from 'clsx';
import type { EstadoTramite } from '@/types';
import { ESTADOS, PASOS_PROGRESO } from '@/config/estados';

/** Barra de progreso por pasos del trámite (P-11). Observado cuenta como "En revisión". */
export function ProgresoPasos({ estado }: { estado: EstadoTramite }) {
  const actual = PASOS_PROGRESO.indexOf(estado === 'OBSERVADO' ? 'EN_REVISION' : estado);
  return (
    <div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={PASOS_PROGRESO.length}
        aria-valuenow={actual + 1}
        aria-valuetext={ESTADOS[estado].etiqueta}
      >
        {PASOS_PROGRESO.map((p, i) => (
          <span
            key={p}
            title={ESTADOS[p].etiqueta}
            className={clsx(
              'h-2 flex-1 rounded-full',
              i < actual
                ? 'bg-acento'
                : i === actual
                  ? estado === 'OBSERVADO'
                    ? 'bg-amber-500'
                    : 'bg-primario'
                  : 'bg-slate-200',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Paso {actual + 1} de {PASOS_PROGRESO.length}:{' '}
        <span className="font-medium text-slate-700">{ESTADOS[estado].etiqueta}</span>
      </p>
    </div>
  );
}
