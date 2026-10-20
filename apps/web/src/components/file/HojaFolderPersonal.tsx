import { Check, Printer } from 'lucide-react';
import clsx from 'clsx';
import type { FileDetalle } from '@/types/files';
import type { RequisitoDelFile } from '@/types/requisitos';
import { anioEnPalabras, filasDelFolder, type FilaFolder } from '@/lib/folder-personal';
import { Button } from '@/components/ui';
import { ZonaImpresion } from '@/pages/documentos/Plantillas';

type DatosHoja = Pick<
  FileDetalle,
  | 'nombres'
  | 'apellidoPaterno'
  | 'apellidoMaterno'
  | 'ci'
  | 'complemento'
  | 'codigo'
  | 'genero'
  | 'especialidad'
  | 'anioFormacion'
  | 'modalidad'
>;

const apellidosYNombres = (f: DatosHoja) =>
  [f.apellidoPaterno, f.apellidoMaterno, f.nombres].filter(Boolean).join(' ').toUpperCase();

/**
 * En pantalla: la hoja "Documentación existente en folder personal" como tabla, con la marca en Sí o en No según lo
 * que Kardex registró (DEC-062). El estudiante no la edita: los requisitos los registra Kardex (DEC-015).
 */
export function TablaFolder({ requisitos }: { requisitos: readonly RequisitoDelFile[] }) {
  const filas = filasDelFolder(requisitos);
  const pedidos = filas.filter((f) => f.pedido);
  const tiene = pedidos.filter((f) => f.marca === 'SI').length;
  return (
    <div>
      <p className="mb-3 text-sm text-suave">
        Tienes <strong className="text-tinta tabular-nums">{tiene}</strong> de {pedidos.length} documentos obligatorios.
        Los que no te corresponden (por género o modalidad) y los «si corresponde» que no presentaste quedan sin marca.
      </p>
      <div className="overflow-x-auto rounded-[10px] border border-borde">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-borde text-[13px] text-suave">
            <tr>
              <th className="h-10 w-12 px-3 text-right font-normal">N.º</th>
              <th className="px-3 font-normal">Requisito</th>
              <th className="w-16 px-3 text-center font-normal">Sí</th>
              <th className="w-16 px-3 text-center font-normal">No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-regla">
            {filas.map((f) => (
              <tr key={f.nro} className={clsx(!f.pedido && f.marca === null && 'text-suave')}>
                <td className="px-3 py-2.5 text-right tabular-nums">{f.nro}</td>
                <td className="px-3 py-2.5">{f.texto}</td>
                <td className="px-3 py-2.5 text-center">
                  {f.marca === 'SI' && <Check className="mx-auto size-4 text-[#247b50]" aria-label="Sí" />}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {f.marca === 'NO' && <Check className="mx-auto size-4 text-[#b4232a]" aria-label="No" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Una fila de datos de la cabecera de la hoja: etiqueta a la derecha, valor a la izquierda, como en papel. */
const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <>
    <dt className="text-right font-bold">{etiqueta}:</dt>
    <dd className="uppercase">{valor}</dd>
  </>
);

/** La hoja en el formato de papel de Archivo Kardex, tamaño carta. Solo se ve al imprimir. */
function HojaImpresa({ file: f, filas, gestion }: { file: DatosHoja; filas: FilaFolder[]; gestion: number }) {
  return (
    <article className="mx-auto max-w-[8in] bg-white text-[10.5px] leading-tight text-black">
      <header className="text-center text-[12px] leading-snug font-semibold uppercase">
        <p>Escuela Superior de Formación de Maestros</p>
        <p>“Mcal. Andrés de Santa Cruz y Calahumana”</p>
        <p className="font-bold">Unidad Académica Ancocagua</p>
      </header>
      <h1 className="mt-3 text-center text-[13px] leading-snug font-bold uppercase">
        Documentación existente en folder personal
        <br />
        Gestión {gestion}
        <br />
        Uso exclusivo de Archivo Kardex
      </h1>
      <dl className="mt-3 grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1">
        <Dato etiqueta="Apellidos y nombres" valor={apellidosYNombres(f)} />
        <span />
        <span />
        <Dato etiqueta="Cédula de identidad" valor={[f.ci, f.complemento].filter(Boolean).join('-')} />
        <span />
        <span />
        <Dato etiqueta="Código" valor={f.codigo} />
        <Dato etiqueta="Género" valor={f.genero ?? ''} />
        <Dato etiqueta="Especialidad" valor={f.especialidad} />
        <span />
        <span />
        <Dato etiqueta="Año de formación" valor={anioEnPalabras(f.anioFormacion)} />
        <Dato etiqueta="Modalidad" valor={f.modalidad ?? ''} />
      </dl>
      <table className="mt-3 w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-[3px] [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1">
        <thead>
          <tr className="font-bold uppercase">
            <th className="w-10">Nro.</th>
            <th>Requisitos</th>
            <th className="w-10">Si</th>
            <th className="w-10">No</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r) => (
            <tr key={r.nro}>
              <td className="text-center">{r.nro}</td>
              <td className="uppercase">{r.texto}</td>
              <td className="text-center text-[12px] leading-none">{r.marca === 'SI' ? '✓' : ''}</td>
              <td className="text-center text-[12px] leading-none">{r.marca === 'NO' ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-14 grid grid-cols-2 gap-16 text-center uppercase break-inside-avoid">
        <p className="border-t border-black pt-1">Estudiante</p>
        <p className="border-t border-black pt-1">
          Unidad de Sistemas y
          <br />
          Archivo Kardex
        </p>
      </div>
    </article>
  );
}

/**
 * Botón "Imprimir hoja del folder": deja la hoja en la zona de impresión (oculta en pantalla) y abre el diálogo de
 * impresión del navegador, donde también se puede guardar como PDF.
 */
export function ImprimirFolder({
  file,
  requisitos,
}: {
  file: DatosHoja;
  requisitos: readonly RequisitoDelFile[] | undefined;
}) {
  return (
    <>
      <Button variant="secondary" icon={Printer} disabled={!requisitos} onClick={() => window.print()}>
        Imprimir hoja del folder
      </Button>
      {requisitos && (
        <ZonaImpresion>
          <HojaImpresa file={file} filas={filasDelFolder(requisitos)} gestion={new Date().getFullYear()} />
        </ZonaImpresion>
      )}
    </>
  );
}
