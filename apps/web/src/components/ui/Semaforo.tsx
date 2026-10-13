import clsx from 'clsx';
import type { ColorSemaforo } from '@/types';
import { SEMAFORO } from '@/config/estados';

interface Props {
  color: ColorSemaforo;
  texto?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Círculo verde/amarillo/rojo + texto. */
export function Semaforo({ color, texto, size = 'md', className }: Props) {
  const etiqueta = texto ?? SEMAFORO[color].texto;
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className={clsx(
          'inline-block shrink-0 rounded-full ring-2 ring-white',
          SEMAFORO[color].punto,
          size === 'sm' ? 'size-2.5' : size === 'md' ? 'size-3.5' : 'size-6',
        )}
      />
      {etiqueta && (
        <span className={clsx(size === 'lg' ? 'text-base font-semibold' : 'text-sm', SEMAFORO[color].tinta)}>
          {etiqueta}
        </span>
      )}
    </span>
  );
}
