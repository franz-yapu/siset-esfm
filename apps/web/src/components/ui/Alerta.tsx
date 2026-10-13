import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Lock } from 'lucide-react';
import clsx from 'clsx';

type Tipo = 'info' | 'exito' | 'aviso' | 'error' | 'bloqueo';

const ESTILO: Record<Tipo, { clase: string; icono: typeof Info }> = {
  info: { clase: 'border-sky-200 bg-sky-50 text-sky-800', icono: Info },
  exito: { clase: 'border-green-200 bg-green-50 text-green-800', icono: CheckCircle2 },
  aviso: { clase: 'border-amber-200 bg-amber-50 text-amber-800', icono: AlertTriangle },
  error: { clase: 'border-red-200 bg-red-50 text-red-800', icono: AlertTriangle },
  bloqueo: { clase: 'border-red-300 bg-red-600 text-white', icono: Lock },
};

/** Banner de aviso dentro de una pantalla (bloqueo, observaciones, avisos). */
export function Alerta({
  tipo = 'info',
  titulo,
  children,
  accion,
  className,
}: {
  tipo?: Tipo;
  titulo?: ReactNode;
  children?: ReactNode;
  accion?: ReactNode;
  className?: string;
}) {
  const { clase, icono: Icono } = ESTILO[tipo];
  return (
    <div
      role={tipo === 'error' || tipo === 'bloqueo' ? 'alert' : 'status'}
      className={clsx('flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 text-sm', clase, className)}
    >
      <Icono className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && (
          <div className={clsx(titulo && 'mt-0.5', tipo === 'bloqueo' ? 'text-red-50' : 'opacity-90')}>{children}</div>
        )}
      </div>
      {accion}
    </div>
  );
}
