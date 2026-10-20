import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  /** `false`: solo se cierra con un botón del pie (sin Esc, sin la X ni clic afuera). */
  cerrable?: boolean;
}

const ANCHO = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };
const ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Ventana modal accesible: Esc cierra y el foco queda atrapado dentro. */
export function Modal({ open, title, onClose, footer, size = 'md', children, cerrable = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onClose);
  const puedeCerrar = useRef(cerrable);
  useEffect(() => {
    cerrar.current = onClose;
    puedeCerrar.current = cerrable;
  });

  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(ENFOCABLES))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && puedeCerrar.current) cerrar.current();
      if (e.key !== 'Tab' || !panel) return;
      const els = [...panel.querySelectorAll<HTMLElement>(ENFOCABLES)];
      if (!els.length) return;
      const [primero, ultimo] = [els[0], els[els.length - 1]];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previo?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-[#14181f]/45 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => cerrable && e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={clsx('flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:rounded-xl', ANCHO[size])}
      >
        <header className="flex items-center justify-between gap-4 border-b border-regla px-5 py-3">
          <h2 id="modal-titulo" className="text-base font-semibold text-tinta">
            {title}
          </h2>
          {cerrable && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-suave hover:bg-activo hover:text-tinta"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          )}
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-regla px-5 py-3">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
