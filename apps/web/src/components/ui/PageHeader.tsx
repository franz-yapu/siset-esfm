import type { ReactNode } from 'react';

/** Título de la pantalla (un sustantivo, 22px) con una línea sobre los datos, y a la derecha la acción principal. */
export function PageHeader({
  titulo,
  subtitulo,
  acciones,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-7 font-semibold text-tinta">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-3xl text-[15px] text-suave">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}
