import type { SeccionReporte } from '@/lib/reporte-hojas-ruta';
import { ESTADO_MINISTERIO, INSTITUCION, NOMBRE_ESCUELA, UNIDAD_ACADEMICA } from '@/config/institucion';

/**
 * El reporte de trámites en papel carta (observación #5 del tutor, SDD OBS-T1): encabezado institucional, filtros,
 * quién lo generó y cuándo, y las mismas tablas que el CSV. Los gráficos no se imprimen: las cifras van en tablas.
 */
export function ReporteImpreso({
  filtros,
  generado,
  secciones,
}: {
  filtros: string;
  generado: string;
  secciones: readonly SeccionReporte[];
}) {
  return (
    <article className="mx-auto max-w-[8in] bg-white text-[11px] leading-snug text-black">
      <header className="border-b-2 border-black pb-2 text-center text-[11px] uppercase">
        <p className="font-bold">{ESTADO_MINISTERIO}</p>
        <p>{INSTITUCION}</p>
        <p className="font-semibold">{NOMBRE_ESCUELA}</p>
        <p>{UNIDAD_ACADEMICA}</p>
      </header>
      <h1 className="mt-3 text-center text-[14px] font-bold uppercase">Reporte de trámites</h1>
      <p className="mt-1 text-center">{filtros}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
        {secciones.map((s) => (
          <section
            key={s.titulo}
            className={s.columnas.length > 2 ? 'col-span-2 break-inside-avoid-page' : 'break-inside-avoid'}
          >
            <h2 className="mb-1 font-bold uppercase">{s.titulo}</h2>
            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-black [&_th]:bg-slate-100 [&_th]:px-1.5 [&_th]:py-0.5 [&_th]:text-left">
              <thead>
                <tr>
                  {s.columnas.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.filas.length === 0 ? (
                  <tr>
                    <td colSpan={s.columnas.length} className="text-center">
                      Sin datos
                    </td>
                  </tr>
                ) : (
                  s.filas.map((f, i) => (
                    <tr key={i}>
                      {f.map((v, j) => (
                        <td key={j} className={typeof v === 'number' ? 'text-right tabular-nums' : undefined}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <footer className="mt-6 border-t border-black pt-1 text-[10px]">{generado} · SISET</footer>
    </article>
  );
}
