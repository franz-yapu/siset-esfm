import { useEffect, useId, useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { avisoOcultoParaSiempre, ocultarAvisoParaSiempre } from '@/lib/aviso-primer-ingreso';

/**
 * Ventana flotante con el usuario y la contraseña del primer ingreso del estudiante (DEC-064 #4, DEC-067). No bloquea
 * el login: se puede escribir con ella abierta. La controla el login (`abierto`), que la abre al entrar si la persona no
 * pidió ocultarla y cuando toca el ícono de ajustes.
 */
export function AvisoPrimerIngreso({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const titulo = useId();
  const [noMostrar, setNoMostrar] = useState(avisoOcultoParaSiempre);

  const cerrar = () => {
    ocultarAvisoParaSiempre(noMostrar);
    onCerrar();
  };

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ocultarAvisoParaSiempre(noMostrar);
        onCerrar();
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto, noMostrar, onCerrar]);

  if (!abierto) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titulo}
      className="entrada-toast fixed inset-x-4 bottom-4 z-40 rounded-xl border border-borde bg-white shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
    >
      <header className="flex items-start gap-3 border-b border-regla px-4 py-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-acento" strokeWidth={1.75} aria-hidden />
        <h2 id={titulo} className="flex-1 text-sm font-semibold text-primario">
          ¿Eres estudiante y entras por primera vez?
        </h2>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar el aviso"
          className="-m-1 rounded-md p-1 text-suave hover:bg-activo hover:text-tinta"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="space-y-1.5 px-4 py-3 text-sm text-tinta">
        <p>
          <strong>Usuario:</strong> tu número de CI (con complemento, así:{' '}
          <span className="font-mono whitespace-nowrap">1234567-1A</span>
          ).
        </p>
        <p>
          <strong>Contraseña:</strong> tu fecha de nacimiento en el formato{' '}
          <span className="font-mono whitespace-nowrap">dd-mm-aaaa</span>, con guiones. Ejemplo: si naciste el 15 de
          marzo de 2004, escribe <span className="font-mono whitespace-nowrap">15-03-2004</span>.
        </p>
        <p className="text-suave">Al entrar, el sistema te pedirá cambiarla por una tuya.</p>
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-regla px-4 py-3">
        <label className="flex items-center gap-2 text-[13px] text-suave">
          <input
            type="checkbox"
            checked={noMostrar}
            onChange={(e) => setNoMostrar(e.target.checked)}
            className="size-4 accent-[var(--color-primario)]"
          />
          No volver a mostrar
        </label>
        <Button size="sm" onClick={cerrar}>
          Entendido
        </Button>
      </footer>
    </section>
  );
}
