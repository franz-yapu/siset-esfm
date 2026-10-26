import { useState } from 'react';
import { Printer, ReceiptText } from 'lucide-react';
import type { EntregaRequisito } from '@/types/requisitos';
import { fechaHora } from '@/lib/formato';
import { documentoDe, lineasDeCambios, nroComprobante, resumenEntrega } from '@/lib/entregas-requisitos';
import { Alerta, Button, Cargando, DataTable, Modal } from '@/components/ui';
import { ZonaImpresion } from '@/pages/documentos/Plantillas';
import { INSTITUCION, NOMBRE_ESCUELA, UNIDAD_ACADEMICA } from '@/config/institucion';

interface Titular {
  nombre: string;
  ci: string;
  codigo: string;
}

/**
 * Las entregas de requisitos del file, con un comprobante de recepción por cada una (observación #3 del tutor, SDD
 * OBS-T1). Kardex lo imprime al recibir el documento; el estudiante lo ve y lo reimprime desde "Mis entregas".
 */
export function EntregasRequisitos({
  titular,
  entregas,
  cargando,
  error,
  propio = false,
}: {
  titular: Titular;
  entregas: EntregaRequisito[] | undefined;
  cargando: boolean;
  error: Error | null;
  propio?: boolean;
}) {
  const [elegida, setElegida] = useState<EntregaRequisito | null>(null);
  if (cargando) return <Cargando />;
  if (error || !entregas) return <Alerta tipo="error">{error?.message ?? 'No se pudieron leer las entregas.'}</Alerta>;

  return (
    <>
      <p className="mb-3 text-sm text-suave">
        {propio
          ? 'Cada vez que Kardex registra o actualiza uno de tus documentos queda aquí, con fecha y hora. El comprobante respalda que lo entregaste.'
          : 'Cada registro de un requisito de este file, con fecha y hora. Imprima el comprobante y entrégueselo al estudiante.'}
      </p>
      <DataTable
        data={entregas}
        rowKey={(e) => e.nro}
        vacio="Todavía no hay entregas registradas en el sistema"
        columns={[
          { key: 'fecha', header: 'Fecha y hora', principal: true, render: (e) => fechaHora(e.fecha) },
          { key: 'documento', header: 'Documento', render: (e) => documentoDe(e) },
          { key: 'resumen', header: 'Qué pasó', render: (e) => resumenEntrega(e) },
          { key: 'registradoPor', header: 'Registró', render: (e) => e.registradoPor?.nombre ?? '—' },
          {
            key: 'nro',
            header: 'Comprobante',
            render: (e) => (
              <Button variant="secondary" icon={ReceiptText} onClick={() => setElegida(e)}>
                {nroComprobante(e.nro)}
              </Button>
            ),
          },
        ]}
      />
      <Modal
        open={elegida !== null}
        title="Comprobante de recepción"
        size="xl"
        onClose={() => setElegida(null)}
        footer={
          <Button icon={Printer} onClick={() => window.print()}>
            Imprimir
          </Button>
        }
      >
        {elegida && (
          <div className="overflow-x-auto">
            <Comprobante titular={titular} e={elegida} />
          </div>
        )}
      </Modal>
      {elegida && (
        <ZonaImpresion prioritaria>
          <style>{'@page { size: letter portrait; margin: 0; }'}</style>
          <Comprobante titular={titular} e={elegida} />
        </ZonaImpresion>
      )}
    </>
  );
}

/** El comprobante en media carta (la mitad de arriba de una hoja carta), como la hoja de ruta. */
function Comprobante({ titular, e }: { titular: Titular; e: EntregaRequisito }) {
  return (
    <article className="mx-auto flex h-[5.5in] w-[8.5in] shrink-0 flex-col border-b border-dashed border-slate-500 bg-white px-[0.5in] pt-[0.4in] pb-[0.3in] text-[10px] leading-snug text-black">
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-1.5">
        <div className="text-[8px] uppercase">
          <p>{INSTITUCION}</p>
          <p className="font-semibold">{NOMBRE_ESCUELA}</p>
          <p>{UNIDAD_ACADEMICA} · Archivo Kardex</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase">Comprobante de recepción</p>
          <p className="text-[15px] font-bold tracking-wider">{nroComprobante(e.nro)}</p>
          <p>{fechaHora(e.fecha)}</p>
        </div>
      </header>
      <dl className="mt-3 grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1">
        <dt className="font-semibold">Estudiante:</dt>
        <dd>{titular.nombre}</dd>
        <dt className="font-semibold">C.I.:</dt>
        <dd>{titular.ci}</dd>
        <dt className="font-semibold">Documento:</dt>
        <dd>{documentoDe(e)}</dd>
        <dt className="font-semibold">Código:</dt>
        <dd>{titular.codigo}</dd>
      </dl>
      <table className="mt-3 w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 [&_th]:text-left">
        <thead>
          <tr>
            <th className="w-1/3">Dato registrado</th>
            <th>Valor</th>
            <th className="w-1/4">Antes</th>
          </tr>
        </thead>
        <tbody>
          {lineasDeCambios(e).map((l) => (
            <tr key={l.etiqueta}>
              <td>{l.etiqueta}</td>
              <td className="font-semibold">{l.valor}</td>
              <td>{l.antes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2">
        Registrado en SISET por <strong>{e.registradoPor?.nombre ?? '—'}</strong>. El estudiante puede verlo en{' '}
        <em>Mi file académico → Mis entregas</em> con el mismo N.º.
      </p>
      <div className="mt-auto grid grid-cols-2 gap-10 text-center text-[9px]">
        <p className="border-t border-black pt-0.5">Firma del estudiante</p>
        <p className="border-t border-black pt-0.5">Firma y sello de Archivo Kardex</p>
      </div>
    </article>
  );
}
