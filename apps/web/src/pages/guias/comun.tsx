import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { NOMBRE_INSTITUCION, UNIDAD_ACADEMICA } from '@/config/institucion';

export interface Apartado {
  id: string;
  titulo: string;
}

/**
 * Página de guía pública (DEC-048): sin sesión, con índice y secciones. La comparten el manual del personal, la guía
 * de estudio del código y las preguntas de defensa.
 */
export function PaginaGuia({
  titulo,
  subtitulo,
  apartados,
  children,
}: {
  titulo: string;
  subtitulo: string;
  apartados: readonly Apartado[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fondo">
      <header className="bg-primario text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/guia" className="flex items-center gap-2 font-semibold">
            <BookOpen className="size-5" aria-hidden />
            SISET · Guías
          </Link>
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-sky-100 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden />
            Iniciar sesión
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold text-tinta">{titulo}</h1>
        <p className="mt-1 text-suave">{subtitulo}</p>
        {apartados.length > 0 && (
          <nav aria-label="Contenido" className="mt-5 rounded-[10px] border border-borde bg-white p-4">
            <p className="mb-2 text-[13px] font-medium text-suave">Contenido</p>
            <ol className="grid gap-1 text-sm sm:grid-cols-2">
              {apartados.map((a, i) => (
                <li key={a.id}>
                  <a href={`#${a.id}`} className="text-acento hover:underline">
                    {i + 1}. {a.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="mt-6 space-y-6">{children}</div>
        <p className="mt-10 text-center text-xs text-suave">
          SISET · {NOMBRE_INSTITUCION} · {UNIDAD_ACADEMICA}
        </p>
      </main>
    </div>
  );
}

export function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-[10px] border border-borde bg-white p-5">
      <h2 className="mb-3 text-lg font-semibold text-tinta">{titulo}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-tinta [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
        {children}
      </div>
    </section>
  );
}

export const Subtitulo = ({ children }: { children: ReactNode }) => (
  <h3 className="pt-2 font-semibold text-tinta">{children}</h3>
);

/** Ruta de un archivo del repositorio. */
export const Archivo = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-[#eef1f4] px-1.5 py-0.5 text-[0.8rem] break-all text-primario">{children}</code>
);

/** Nombre de una función, constante o tabla. */
export const Codigo = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-amber-50 px-1 py-0.5 text-[0.8rem] text-amber-900">{children}</code>
);

export const Nota = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">{children}</p>
);

/** Pregunta desplegable (defensa, preguntas frecuentes). */
export function Pregunta({ p, children }: { p: string; children: ReactNode }) {
  return (
    <details className="group rounded-[10px] border border-borde p-3 open:bg-[#f5f7fa]">
      <summary className="cursor-pointer font-medium text-tinta marker:text-acento">{p}</summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  );
}

/** Tabla simple de dos o más columnas. */
export function Tabla({ cabecera, filas }: { cabecera: readonly string[]; filas: readonly (readonly ReactNode[])[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-borde text-[13px] text-suave">
            {cabecera.map((c) => (
              <th key={c} className="py-2 pr-4 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-regla align-top">
              {f.map((c, j) => (
                <td key={j} className="py-2 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
