import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import type { UsuarioBitacora } from '@/types/bitacora';
import { bitacoraService } from '@/services/bitacora.service';

interface Props {
  /** Usuario elegido: id + nombre si se conoce (al abrir un enlace solo se conoce el id). */
  valor: { id: number; nombre?: string } | null;
  onCambiar: (u: UsuarioBitacora | null) => void;
}

const MIN_CARACTERES = 2;
const ESPERA_MS = 300;

/** Filtro "Usuario" de P-48 (SDD S6.5 §2.5): busca en GET /usuarios?texto= y filtra por id. */
export function BuscadorUsuario({ valor, onCambiar }: Props) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [opciones, setOpciones] = useState<UsuarioBitacora[]>([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const t = texto.trim();
    if (t.length < MIN_CARACTERES) return;
    let vivo = true;
    const espera = setTimeout(() => {
      bitacoraService
        .buscarUsuarios(t)
        .then((r) => {
          if (vivo) {
            setOpciones(r);
            setAbierto(true);
          }
        })
        .catch(() => {
          if (vivo) setOpciones([]);
        });
    }, ESPERA_MS);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, [texto]);

  if (valor) {
    return (
      <div>
        <span className="mb-1 block text-sm font-medium text-tinta">Usuario</span>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-control bg-[#f5f7fa] px-3 py-2 text-sm">
          <span className="truncate">{valor.nombre ?? `Usuario #${valor.id}`}</span>
          <button
            type="button"
            className="rounded p-0.5 text-suave hover:bg-slate-200"
            aria-label="Quitar filtro de usuario"
            onClick={() => onCambiar(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-tinta">
        Usuario
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        autoComplete="off"
        placeholder="CI o nombre"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (e.target.value.trim().length < MIN_CARACTERES) setAbierto(false);
        }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="block w-full rounded-lg border border-control bg-white px-3 py-2 text-sm text-tinta placeholder:text-suave focus:border-acento focus:ring-2 focus:ring-acento/20 focus:outline-none"
      />
      {abierto && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-[10px] border border-borde bg-white py-1 shadow-lg"
        >
          {opciones.length === 0 ? (
            <li className="px-3 py-2 text-sm text-suave">Sin coincidencias</li>
          ) : (
            opciones.map((u) => (
              <li key={u.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[#f5f7fa]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTexto('');
                    setAbierto(false);
                    onCambiar(u);
                  }}
                >
                  {u.nombre} <span className="text-suave">· {u.usuario}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
