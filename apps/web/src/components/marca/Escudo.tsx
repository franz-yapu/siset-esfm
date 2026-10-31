import clsx from 'clsx';
import escudoPantalla from '@/assets/escudo-ancocagua-pantalla.webp';
import escudoImpresion from '@/assets/escudo-ancocagua-impresion.webp';

/** El texto alternativo: lo que dice el escudo. */
export const ALT_ESCUDO =
  'Escudo de la Escuela Superior de Formación de Maestros “Mcal. Andrés de Santa Cruz y Calahumana”, Unidad Académica Ancocagua';

/**
 * El escudo de la Unidad Académica Ancocagua (DEC-068). Dos tamaños del mismo archivo de la escuela: `pantalla`
 * (320 px, el login) e `impresion` (360 px, para que salga nítido en papel a menos de una pulgada). El tamaño en
 * pantalla o en papel lo da `className`.
 */
export function Escudo({ uso, className }: { uso: 'pantalla' | 'impresion'; className?: string }) {
  return (
    <img
      src={uso === 'pantalla' ? escudoPantalla : escudoImpresion}
      alt={ALT_ESCUDO}
      width={uso === 'pantalla' ? 320 : 360}
      height={uso === 'pantalla' ? 320 : 360}
      decoding="async"
      className={clsx('shrink-0 select-none', className)}
    />
  );
}
