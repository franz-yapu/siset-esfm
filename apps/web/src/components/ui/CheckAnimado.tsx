import clsx from 'clsx';

/**
 * Checkmark que se dibuja al aparecer (observación #14 del tutor, SDD OBS-T1): un círculo y el trazo del visto, en
 * medio segundo. Con "reducir movimiento" en el sistema aparece dibujado, sin animación.
 */
export function CheckAnimado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={clsx('check-animado shrink-0', className)}>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        pathLength={1}
        className="check-animado__circulo"
      />
      <path
        d="M7.5 12.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="check-animado__visto"
      />
    </svg>
  );
}
