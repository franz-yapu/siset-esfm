import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface Props {
  pagina: number;
  porPagina: number;
  total: number;
  onCambiar: (pagina: number) => void;
  /** Mientras llega la página pedida. */
  cargando?: boolean;
}

/**
 * Paginador de los listados paginados en el servidor (DEC-017: { datos, pagina, porPagina, total }).
 * Lo comparten usuarios (S1.13) y bitácora (S6.5).
 */
export function Paginacion({ pagina, porPagina, total, onCambiar, cargando }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm text-slate-600">
      <p aria-live="polite">{total === 0 ? 'Sin resultados' : `${desde}–${hasta} de ${total}`}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          disabled={pagina <= 1 || cargando}
          onClick={() => onCambiar(pagina - 1)}
          aria-label="Página anterior"
        />
        <span>
          Página {pagina} de {paginas}
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronRight}
          disabled={pagina >= paginas || cargando}
          onClick={() => onCambiar(pagina + 1)}
          aria-label="Página siguiente"
        />
      </div>
    </nav>
  );
}
