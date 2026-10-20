import { Link } from 'react-router';
import clsx from 'clsx';

interface Props {
  titulo: string;
  valor: number | string;
  to?: string;
  detalle?: string;
  /** Pide atención (bloqueados, en rojo, atrasados): la cifra va en rojo solo si no es cero. */
  alerta?: boolean;
}

/**
 * Un indicador: la etiqueta arriba y la cifra debajo, sin ícono ni color propio. Va dentro de `GrillaKpi`, que los
 * reúne en un solo panel dividido por líneas finas.
 */
export function KpiCard({ titulo, valor, to, detalle, alerta }: Props) {
  const atencion = alerta && valor !== 0 && valor !== '0';
  const cuerpo = (
    <>
      <p className="text-[13px] text-suave">{titulo}</p>
      <p className={clsx('mt-1 text-[28px] leading-8 tabular-nums', atencion ? 'text-[#c4242a]' : 'text-tinta')}>
        {valor}
      </p>
      {detalle && <p className="mt-0.5 text-xs text-suave">{detalle}</p>}
    </>
  );
  const clase = 'block min-w-0 bg-white px-4 py-3.5';
  return to ? (
    <Link
      to={to}
      className={clsx(
        clase,
        'transition-colors hover:bg-[#f7f9fb] focus-visible:relative focus-visible:outline-2 focus-visible:outline-acento',
      )}
    >
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

const COLUMNAS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-3 xl:grid-cols-6',
} as const;

/**
 * Los indicadores de una pantalla en un solo panel con divisiones de 1px (el borde sale del hueco entre celdas). Las
 * columnas siguen a la cantidad; en celular van de a dos, y si sobra una ocupa toda la fila.
 */
export function GrillaKpi({
  columnas,
  className,
  children,
}: {
  columnas: keyof typeof COLUMNAS;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-borde bg-borde [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1',
        COLUMNAS[columnas],
        className,
      )}
    >
      {children}
    </div>
  );
}
