import { Link } from 'react-router';
import clsx from 'clsx';

export interface PasoCamino {
  etiqueta: string;
  total: number;
  to: string;
}

/**
 * El camino de los trámites del puesto: cada paso del flujo con cuántos hay, en orden y unidos por una línea, como la
 * marca de SISET. El punto se llena en verde donde hay trabajo; queda hueco donde no hay nada. En celular el camino
 * baja en vertical.
 */
export function CaminoTramites({ titulo, pasos }: { titulo: string; pasos: PasoCamino[] }) {
  return (
    <section className="mb-6" aria-label={titulo}>
      <h2 className="mb-2 text-[15px] font-semibold text-tinta">{titulo}</h2>
      <ol className="overflow-hidden rounded-[10px] border border-borde bg-white sm:flex">
        {pasos.map((p, i) => {
          const ultimo = i === pasos.length - 1;
          return (
            <li key={p.etiqueta} className="min-w-0 sm:flex-1">
              <Link
                to={p.to}
                className="group flex gap-3 px-4 py-3 transition-colors hover:bg-[#f7f9fb] focus-visible:relative focus-visible:outline-2 focus-visible:outline-acento sm:block sm:py-3.5"
              >
                {/* El punto y el tramo hacia el paso siguiente (abajo en celular, a la derecha en escritorio). */}
                <span className="flex flex-col items-center sm:-mr-4 sm:flex-row" aria-hidden>
                  <span
                    className={clsx(
                      'size-2.5 shrink-0 rounded-full',
                      p.total > 0 ? 'bg-acento' : 'border-[1.5px] border-control bg-white',
                    )}
                  />
                  <span
                    className={clsx('min-h-6 w-px flex-1 bg-borde sm:h-px sm:min-h-0 sm:w-auto', ultimo && 'invisible')}
                  />
                </span>
                <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 sm:mt-2.5 sm:block">
                  <span className="text-[13px] text-suave group-hover:text-tinta sm:block">{p.etiqueta}</span>
                  <span className="text-[22px] leading-7 text-tinta tabular-nums sm:mt-1 sm:block sm:text-[28px] sm:leading-8">
                    {p.total}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
