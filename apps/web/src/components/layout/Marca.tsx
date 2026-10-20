import clsx from 'clsx';

/**
 * La marca de SISET: el camino de una hoja de ruta entre las dos sedes, Calahumana (La Paz) y Ancocagua, como dos
 * puntos unidos por un trazo. Va en el azul institucional; el nombre, en tinta.
 */
export function Marca({ className, conNombre = true }: { className?: string; conNombre?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden>
        <rect width="28" height="28" rx="7" className="fill-primario" />
        <path
          d="M8.5 19.5c3.5 0 4-3.25 5.5-5.5s2-5.5 5.5-5.5"
          fill="none"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeDasharray="0.1 3.4"
        />
        <circle cx="8.5" cy="19.5" r="2.5" fill="white" />
        <circle cx="19.5" cy="8.5" r="2.5" fill="none" stroke="white" strokeWidth="1.75" />
      </svg>
      {conNombre && <span className="text-[15px] font-semibold tracking-tight text-tinta">SISET</span>}
    </span>
  );
}
