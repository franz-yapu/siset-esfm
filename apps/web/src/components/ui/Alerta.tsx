import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Lock } from 'lucide-react';
import clsx from 'clsx';

type Tipo = 'info' | 'exito' | 'aviso' | 'error' | 'bloqueo';

const ESTILO: Record<Tipo, { clase: string; icono: typeof Info }> = {
  // Pares pálidos con tinta del mismo tono; el bloqueo es el único lleno, porque impide seguir.
  info: { clase: 'border-[#cfe0f1] bg-acento-palido text-primario-oscuro', icono: Info },
  exito: { clase: 'border-[#bfe8cd] bg-[#effaf3] text-[#14532d]', icono: CheckCircle2 },
  aviso: { clase: 'border-[#fde68a] bg-[#fffbeb] text-[#92400e]', icono: AlertTriangle },
  error: { clase: 'border-[#f6c9c4] bg-[#fff4f2] text-[#831c1e]', icono: AlertTriangle },
  bloqueo: { clase: 'border-[#a51d22] bg-[#c4242a] text-white', icono: Lock },
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
      className={clsx('flex flex-wrap items-start gap-3 rounded-[10px] border px-4 py-3 text-sm', clase, className)}
    >
      <Icono className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && (
          <div className={clsx(titulo && 'mt-0.5', tipo === 'bloqueo' ? 'text-white' : undefined)}>{children}</div>
        )}
      </div>
      {accion}
    </div>
  );
}
