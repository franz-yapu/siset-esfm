import { Link, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useHojaRuta } from '@/hooks/useHojasRuta';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import type { DetalleHojaRuta } from '@/types/hojas-ruta';
import { fecha, fechaHora } from '@/lib/formato';
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
 * P-32 · Carátula de la hoja de ruta (S3.5): hoja carta con el QR del seguimiento público y los pasos del trámite
 * según su tipo (DEC-033), con los ya registrados llenados y espacio para la firma y el sello en papel. Sin "pases"
 * entre oficinas (D-35, propuesta). Al imprimir solo sale la hoja (DEC-042).
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
      <div className="no-print mx-auto mb-4 flex max-w-[8.5in] justify-between gap-2 px-4">
        <Link
          to={`/hojas-ruta/${h.nro}`}
          className="inline-flex items-center gap-1 text-sm text-suave hover:text-tinta"
        >
          <ArrowLeft className="size-4" />
          Volver al trámite
        </Link>
        <Button icon={Printer} onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <Hoja h={h} />
      <ZonaImpresion>
        <Hoja h={h} />
      </ZonaImpresion>
    </div>
  );
}

/** La hoja carta: se muestra en pantalla y se repite en la zona de impresión. */
function Hoja({ h }: { h: DetalleHojaRuta }) {
  const sedeIngreso = h.sedeIngreso.codigo === 'ANCOCAGUA' ? 'ANCOCAGUA' : 'LA_PAZ';
  const pasos = pasosDelFlujo(flujoDe(h.tipo.requiereValorado, sedeIngreso));
  return (
    <article className="mx-auto min-h-[11in] max-w-[8.5in] bg-white p-[0.75in] text-tinta shadow-lg print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
        <div className="text-xs leading-relaxed uppercase">
          <p className="font-bold">{ESTADO_MINISTERIO}</p>
          <p>{INSTITUCION}</p>
          <p className="font-semibold">{NOMBRE_ESCUELA}</p>
          <p>{UNIDAD_ACADEMICA}</p>
        </div>
        <QRCodeSVG value={urlSeguimiento(h.nro)} size={104} />
      </header>
      <h1 className="mt-6 text-center text-lg font-bold tracking-wide uppercase">Hoja de ruta</h1>
      <p className="text-center text-3xl font-bold tracking-widest">{h.nro}</p>
      <p className="mt-1 text-center text-xs text-suave">Consulte el estado en línea escaneando el código QR</p>

      <table className="mt-6 w-full border border-slate-900 text-sm">
        <tbody className="[&_td]:border [&_td]:border-slate-900 [&_td]:px-3 [&_td]:py-2">
          <tr>
            <td className="w-1/3 font-semibold">Titular</td>
            <td>{h.titular.nombre}</td>
          </tr>
          <tr>
            <td className="font-semibold">C.I.</td>
            <td>{h.titular.ci}</td>
          </tr>
          <tr>
            <td className="font-semibold">Tipo de trámite</td>
            <td>{h.tipo.nombre}</td>
          </tr>
          <tr>
            <td className="font-semibold">N.º de valorado</td>
            <td>{h.nroValorado ?? '—'}</td>
          </tr>
          <tr>
            <td className="font-semibold">Fecha de ingreso</td>
            <td>
              {fechaHora(h.fechaIngreso)} · {sedeHr(h.movimientos[0]?.sede ?? '')}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-8 mb-2 text-sm font-bold uppercase">Pasos del trámite</h2>
      <table className="w-full border border-slate-900 text-sm">
        <thead>
          <tr className="[&_th]:border [&_th]:border-slate-900 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left">
            <th>Paso</th>
            <th className="w-36">Responsable</th>
            <th className="w-24">Fecha</th>
            <th className="w-40">Firma y sello</th>
          </tr>
        </thead>
        <tbody>
          {pasos.map((p) => {
            const hecho = h.movimientos.find((m) => m.estadoNuevo === p.hacia);
            return (
              <tr key={p.hacia} className="h-12 [&_td]:border [&_td]:border-slate-900 [&_td]:px-2">
                <td>
                  {ESTADOS_HR[p.hacia].etiqueta}
                  <span className="block text-xs text-suave">{sedeHr(p.sede)}</span>
                </td>
                <td className="text-xs">{hecho ? hecho.usuario.nombre : RESPONSABLE[p.rol]}</td>
                <td className="text-xs">{hecho ? fecha(hecho.fecha) : ''}</td>
                <td />
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-6 text-xs text-suave">
        Documento generado por SISET. Cada paso se registra también en el sistema.
      </p>
    </article>
  );
}
