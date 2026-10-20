import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import clsx from 'clsx';
import { EmptyState } from './EmptyState';
import { Esqueleto } from './Spinner';

export interface Columna<T> {
  key: string;
  header: string;
  render?: (fila: T) => ReactNode;
  /** Valor para ordenar; si falta, la columna no se ordena. */
  sortValue?: (fila: T) => string | number;
  className?: string;
  /** No mostrar esta columna en la vista de tarjetas (celular). */
  ocultarEnMovil?: boolean;
  /** Columna principal: en celular va como título de la tarjeta. */
  principal?: boolean;
  /** Cifras o fechas que se comparan: a la derecha y con dígitos tabulares, encabezado incluido. */
  numerica?: boolean;
}

interface Props<T> {
  columns: Columna<T>[];
  data: T[];
  rowKey: (fila: T) => string | number;
  searchable?: boolean;
  /** Texto donde busca el buscador; por defecto, todo el objeto serializado. */
  searchText?: (fila: T) => string;
  pageSize?: number;
  onRowClick?: (fila: T) => void;
  loading?: boolean;
  vacio?: string;
  /** Selección múltiple (ej. "Recibir seleccionados"). */
  seleccion?: { seleccionados: Set<string | number>; onChange: (s: Set<string | number>) => void };
  resaltar?: (fila: T) => boolean;
  toolbar?: ReactNode;
}

/** Tabla con buscador, ordenamiento y paginación. En celular se muestra como tarjetas. */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  searchable,
  searchText,
  pageSize = 10,
  onRowClick,
  loading,
  vacio = 'Sin resultados',
  seleccion,
  resaltar,
  toolbar,
}: Props<T>) {
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<{ key: string; asc: boolean } | null>(null);
  const [pagina, setPagina] = useState(0);

  const filas = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    let r = t ? data.filter((f) => (searchText ? searchText(f) : JSON.stringify(f)).toLowerCase().includes(t)) : data;
    const col = orden && columns.find((c) => c.key === orden.key);
    if (orden && col?.sortValue) {
      const v = col.sortValue;
      r = [...r].sort((a, b) => {
        const [x, y] = [v(a), v(b)];
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'es');
        return orden.asc ? cmp : -cmp;
      });
    }
    return r;
  }, [data, busqueda, orden, columns, searchText]);

  const paginas = Math.max(1, Math.ceil(filas.length / pageSize));
  const actual = Math.min(pagina, paginas - 1);
  const visibles = filas.slice(actual * pageSize, actual * pageSize + pageSize);

  const ordenar = (c: Columna<T>) => {
    if (!c.sortValue) return;
    setOrden((o) => (o?.key === c.key ? { key: c.key, asc: !o.asc } : { key: c.key, asc: true }));
  };

  const alternar = (k: string | number) => {
    if (!seleccion) return;
    const s = new Set(seleccion.seleccionados);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    seleccion.onChange(s);
  };
  const todos = visibles.length > 0 && visibles.every((f) => seleccion?.seleccionados.has(rowKey(f)));
  const alternarTodos = () => seleccion?.onChange(todos ? new Set() : new Set(visibles.map(rowKey)));

  const principal = columns.find((c) => c.principal) ?? columns[0];
  const celda = (c: Columna<T>, f: T): ReactNode =>
    c.render ? c.render(f) : String((f as Record<string, unknown>)[c.key] ?? '—');

  return (
    <div>
      {(searchable || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchable && (
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="sr-only">Buscar</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-suave"
                aria-hidden
              />
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(0);
                }}
                placeholder="Buscar…"
                className="h-9 w-full rounded-md border border-control bg-white pr-3 pl-9 text-sm text-tinta placeholder:text-[#6b7280] focus:border-acento focus:ring-2 focus:ring-acento/20 focus:outline-none"
              />
            </label>
          )}
          {toolbar}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Esqueleto key={i} className="h-10" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <div className="rounded-[10px] border border-borde bg-white [[data-tarjeta]_&]:border-0">
          <EmptyState titulo={vacio} />
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-x-auto rounded-[10px] border border-borde bg-white md:block [[data-tarjeta]_&]:-mx-3 [[data-tarjeta]_&]:-mb-2 [[data-tarjeta]_&]:rounded-none [[data-tarjeta]_&]:border-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-borde text-[13px] text-suave">
                <tr>
                  {seleccion && (
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={todos}
                        onChange={alternarTodos}
                        aria-label="Seleccionar todos"
                        className="accent-primario"
                      />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={clsx(
                        'h-10 px-3 font-normal whitespace-nowrap',
                        c.numerica && 'text-right',
                        c.className,
                      )}
                      aria-sort={orden?.key === c.key ? (orden.asc ? 'ascending' : 'descending') : undefined}
                    >
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => ordenar(c)}
                          className="inline-flex items-center gap-1 hover:text-tinta"
                        >
                          {c.header}
                          {orden?.key === c.key &&
                            (orden.asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-regla">
                {visibles.map((f) => {
                  const k = rowKey(f);
                  return (
                    <tr
                      key={k}
                      onClick={onRowClick ? () => onRowClick(f) : undefined}
                      className={clsx(
                        onRowClick && 'cursor-pointer hover:bg-[#f7f9fb]',
                        resaltar?.(f) && 'bg-[#fffbeb]',
                        seleccion?.seleccionados.has(k) && 'bg-activo/60',
                      )}
                    >
                      {seleccion && (
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={seleccion.seleccionados.has(k)}
                            onChange={() => alternar(k)}
                            aria-label="Seleccionar fila"
                            className="accent-primario"
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        // Las columnas sin encabezado son de acciones: no disparan el clic de la fila.
                        <td
                          key={c.key}
                          className={clsx(
                            'px-3 py-3 align-middle',
                            c.numerica && 'text-right tabular-nums',
                            c.className,
                          )}
                          onClick={c.header ? undefined : (e) => e.stopPropagation()}
                        >
                          {celda(c, f)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas */}
          <ul className="space-y-2 md:hidden [[data-tarjeta]_&]:space-y-0 [[data-tarjeta]_&]:divide-y [[data-tarjeta]_&]:divide-regla">
            {visibles.map((f) => {
              const k = rowKey(f);
              return (
                <li
                  key={k}
                  onClick={onRowClick ? () => onRowClick(f) : undefined}
                  className={clsx(
                    'rounded-[10px] border border-borde bg-white p-3 [[data-tarjeta]_&]:rounded-none [[data-tarjeta]_&]:border-0 [[data-tarjeta]_&]:px-0',
                    onRowClick && 'cursor-pointer active:bg-[#f7f9fb]',
                    resaltar?.(f) && 'border-[#fde68a] bg-[#fffbeb]',
                    seleccion?.seleccionados.has(k) && 'ring-2 ring-acento',
                  )}
                >
                  <div className="mb-2 flex items-start gap-2">
                    {seleccion && (
                      <input
                        type="checkbox"
                        checked={seleccion.seleccionados.has(k)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => alternar(k)}
                        aria-label="Seleccionar"
                        className="mt-1 accent-primario"
                      />
                    )}
                    <div className="min-w-0 flex-1 font-medium text-tinta">{celda(principal, f)}</div>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    {columns
                      .filter((c) => c !== principal && !c.ocultarEnMovil)
                      .map((c) => (
                        <div key={c.key} className="contents">
                          {c.header ? <dt className="text-suave">{c.header}</dt> : <dt />}
                          <dd
                            className="min-w-0 text-tinta"
                            onClick={c.header ? undefined : (e) => e.stopPropagation()}
                          >
                            {celda(c, f)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </li>
              );
            })}
          </ul>

          {paginas > 1 && (
            <nav
              className="mt-3 flex items-center justify-between text-sm text-suave tabular-nums"
              aria-label="Paginación"
            >
              <span>
                {actual * pageSize + 1}–{Math.min(filas.length, (actual + 1) * pageSize)} de {filas.length}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPagina(actual - 1)}
                  disabled={actual === 0}
                  aria-label="Página anterior"
                  className="rounded-md border border-control bg-white p-1.5 text-tinta hover:bg-[#f5f7fa] disabled:text-[#9aa5b1] disabled:hover:bg-white"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-2 py-1.5">
                  {actual + 1} / {paginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina(actual + 1)}
                  disabled={actual >= paginas - 1}
                  aria-label="Página siguiente"
                  className="rounded-md border border-control bg-white p-1.5 text-tinta hover:bg-[#f5f7fa] disabled:text-[#9aa5b1] disabled:hover:bg-white"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
