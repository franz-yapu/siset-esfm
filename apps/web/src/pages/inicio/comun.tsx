import type { ReactNode } from 'react';
import { primerNombre } from '@/lib/formato';

/**
 * Cabecera de los inicios por rol: el saludo como título y, debajo, lo que hay que hacer hoy (calculado de los datos);
 * a la derecha, la acción más frecuente del puesto.
 */
export function Saludo({ nombre, children, acciones }: { nombre: string; children?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-7 font-semibold text-tinta">Hola, {primerNombre(nombre)}</h1>
        {children && <p className="mt-1 text-[15px] text-suave">{children}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/**
 * "Tienes 1 trámite por recoger y 2 por remitir": los pasos con algo pendiente, en una frase. El sustantivo va en el
 * primero, en singular o plural según su cantidad.
 */
export function pendientes(
  pasos: { total: number; texto: string }[],
  nada: string,
  sustantivo: [string, string] = ['trámite', 'trámites'],
): string {
  const con = pasos.filter((p) => p.total > 0);
  if (con.length === 0) return nada;
  const partes = con.map((p, i) =>
    i === 0 ? `${p.total} ${sustantivo[p.total === 1 ? 0 : 1]} ${p.texto}` : `${p.total} ${p.texto}`,
  );
  return partes.length === 1 ? `Tienes ${partes[0]}.` : `Tienes ${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}.`;
}
