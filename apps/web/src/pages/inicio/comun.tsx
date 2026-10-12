import type { ReactNode } from 'react';
import { primerNombre } from '@/lib/formato';

/** Saludo de los inicios por rol. */
export function Saludo({ nombre, children }: { nombre: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Hola, {primerNombre(nombre)}</h1>
      {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
    </div>
  );
}

export function GrillaKpi({ children }: { children: ReactNode }) {
  return <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
