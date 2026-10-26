import { Link, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useHojaRuta } from '@/hooks/useHojasRuta';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import type { DetalleHojaRuta } from '@/types/hojas-ruta';
import { fecha, fechaHora } from '@/lib/formato';
import { leerEntrega } from '@/lib/entrega';
import { flujoDe, pasosDelFlujo, type RolHojaRuta } from '@/lib/maquina-hojas-ruta';
import { urlSeguimiento } from '@/lib/qr';
import { Alerta, Button, Cargando } from '@/components/ui';
import { ZonaImpresion } from '@/pages/documentos/Plantillas';
import { ESTADO_MINISTERIO, INSTITUCION, NOMBRE_ESCUELA, UNIDAD_ACADEMICA } from '@/config/institucion';

const RESPONSABLE: Record<RolHojaRuta, string> = {
  SEC_DIR: 'Secretaría de Dirección',
  SEC_COORD: 'Secretaría de Coordinación',
  KARDEX: 'Kardex',
  COORDINADOR: 'Coordinador',
};

/**
 * P-32 · Carátula de la hoja de ruta (S3.5): media carta con el QR del seguimiento público, los pasos del trámite
 * según su tipo (DEC-033), con los ya registrados llenados y espacio para la firma y el sello en papel, y la constancia
 * de entrega con la firma de quien recoge (observación #8 del tutor, SDD OBS-T1). Sin "pases" entre oficinas (D-35,
 * propuesta). Al imprimir solo sale la hoja (DEC-042), en la mitad de arriba de una hoja carta, para cortar.
 */
export function Caratula() {
  const { nro = '' } = useParams();
  const u = useUsuario();
  const { data: h, isLoading, error } = useHojaRuta(nro, u);
  if (isLoading) return <Cargando />;
  if (error || !h)
    return (
      <div className="p-6">
        <Alerta tipo="error">{error?.message ?? 'Trámite no encontrado'}</Alerta>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[8.5in] flex-wrap items-center justify-between gap-2 px-4">
        <Link
          to={`/hojas-ruta/${h.nro}`}
          className="inline-flex items-center gap-1 text-sm text-suave hover:text-tinta"
        >
          <ArrowLeft className="size-4" />
          Volver al trámite
        </Link>
        <span className="text-sm text-suave">Media carta: se imprime en la mitad de arriba de una hoja carta.</span>
        <Button icon={Printer} onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <div className="overflow-x-auto px-4 print:overflow-visible print:px-0">
        <Hoja h={h} />
      </div>
      <ZonaImpresion>
        {/* Sin márgenes de página: la hoja ya trae los suyos y mide exactamente media carta. */}
        <style>{'@page { size: letter portrait; margin: 0; }'}</style>
        <Hoja h={h} />
      </ZonaImpresion>
    </div>
  );
}

/** Una línea para llenar a mano, o el dato ya registrado. */
const Linea = ({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) => (
  <p className="flex items-end gap-1.5">
    <span className="shrink-0 font-semibold">{etiqueta}:</span>
    <span className="min-h-[1.2em] flex-1 border-b border-dotted border-slate-900">{valor ?? ''}</span>
  </p>
);

/**
 * La hoja: 8,5 × 5,5 pulgadas (media carta, apaisada). Se muestra en pantalla y se repite en la zona de impresión. A la
 * izquierda los datos y los pasos; a la derecha la constancia de entrega, llena si ya se entregó.
 */
function Hoja({ h }: { h: DetalleHojaRuta }) {
  const sedeIngreso = h.sedeIngreso.codigo === 'ANCOCAGUA' ? 'ANCOCAGUA' : 'LA_PAZ';
  const pasos = pasosDelFlujo(flujoDe(h.tipo.requiereValorado, sedeIngreso));
  const movEntrega = h.movimientos.find((m) => m.estadoNuevo === 'ENTREGADO');
  const entrega = movEntrega ? leerEntrega(movEntrega.observacion) : null;
  const recibe = entrega ? (entrega.calidad === 'Titular' ? h.titular.nombre : entrega.nombre) : null;
  return (
    <article className="mx-auto flex h-[5.5in] w-[8.5in] shrink-0 flex-col border-b border-dashed border-slate-500 bg-white px-[0.4in] pt-[0.35in] pb-[0.25in] text-[9px] leading-tight text-black shadow-lg print:shadow-none">
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-1.5">
        <div className="text-[8px] leading-snug uppercase">
          <p className="font-bold">{ESTADO_MINISTERIO}</p>
          <p>{INSTITUCION}</p>
          <p className="font-semibold">{NOMBRE_ESCUELA}</p>
          <p>{UNIDAD_ACADEMICA}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-wide uppercase">Hoja de ruta</p>
          <p className="text-[17px] font-bold tracking-widest">{h.nro}</p>
          <p className="text-[7.5px]">Escanee el QR para ver el estado en línea</p>
        </div>
        <QRCodeSVG value={urlSeguimiento(h.nro)} size={64} className="shrink-0" />
      </header>

      <div className="mt-2 grid flex-1 grid-cols-[1fr_2.6in] gap-4">
        <div>
          <dl className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 gap-y-0.5">
            <dt className="font-semibold">Titular:</dt>
            <dd>{h.titular.nombre}</dd>
            <dt className="font-semibold">C.I.:</dt>
            <dd>{h.titular.ci}</dd>
            <dt className="font-semibold">Trámite:</dt>
            <dd>{h.tipo.nombre}</dd>
            <dt className="font-semibold">Valorado:</dt>
            <dd>{h.nroValorado ?? '—'}</dd>
            <dt className="font-semibold">Ingreso:</dt>
            <dd className="col-span-3">
              {fechaHora(h.fechaIngreso)} · {sedeHr(h.movimientos[0]?.sede ?? '')}
            </dd>
          </dl>
          <table className="mt-2 w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:px-1 [&_th]:border [&_th]:border-black [&_th]:px-1 [&_th]:py-0.5 [&_th]:text-left">
            <thead>
              <tr>
                <th>Paso</th>
                <th className="w-[1.15in]">Responsable</th>
                <th className="w-[0.6in]">Fecha</th>
                <th className="w-[0.85in]">Firma y sello</th>
              </tr>
            </thead>
            <tbody>
              {pasos.map((p) => {
                const hecho = h.movimientos.find((m) => m.estadoNuevo === p.hacia);
                return (
                  <tr key={p.hacia} className="h-[0.34in]">
                    <td>
                      {ESTADOS_HR[p.hacia].etiqueta}
                      <span className="block text-[7.5px] text-slate-600">{sedeHr(p.sede)}</span>
                    </td>
                    <td>{hecho ? hecho.usuario.nombre : RESPONSABLE[p.rol]}</td>
                    <td>{hecho ? fecha(hecho.fecha) : ''}</td>
                    <td />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="flex flex-col rounded-sm border-2 border-black p-2" aria-label="Constancia de entrega">
          <h2 className="text-center text-[10px] font-bold uppercase">Constancia de entrega</h2>
          <p className="mt-1 text-[8px]">
            Recibí conforme el documento del trámite {h.nro}, a nombre de {h.titular.nombre}.
          </p>
          <div className="mt-2 space-y-2">
            <Linea etiqueta="Recibe" valor={recibe} />
            <Linea etiqueta="C.I." valor={entrega?.ci} />
            <Linea etiqueta="En calidad de" valor={entrega?.calidad} />
            <Linea etiqueta="Fecha" valor={entrega?.fecha ?? (movEntrega ? fecha(movEntrega.fecha) : null)} />
            <Linea etiqueta="Entregó" valor={movEntrega?.usuario.nombre} />
          </div>
          <p className="mt-1 text-[7.5px] text-slate-600">
            Si recoge un familiar: solo hasta primer grado, con su C.I. y el del titular.
          </p>
          <div className="mt-auto grid grid-cols-2 gap-3 pt-8 text-center text-[8px]">
            <p className="border-t border-black pt-0.5">Firma de quien recibe</p>
            <p className="border-t border-black pt-0.5">Firma y sello de quien entrega</p>
          </div>
        </section>
      </div>
      <p className="mt-1 text-[7px] text-slate-600">
        Documento generado por SISET. Cada paso se registra también en el sistema.
      </p>
    </article>
  );
}
