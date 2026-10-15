import { Link, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useHojaRuta } from '@/hooks/useHojasRuta';
import { sedeHr } from '@/config/estados-hoja-ruta';
import { fechaHora } from '@/lib/formato';
import { urlSeguimiento } from '@/lib/qr';
import { Alerta, Button, Cargando } from '@/components/ui';

/** P-32 · Carátula de hoja de ruta: hoja carta para imprimir, con QR y tabla de pases para firmas físicas. */
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
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Volver al trámite
        </Link>
        <Button icon={Printer} onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <article className="mx-auto min-h-[11in] max-w-[8.5in] bg-white p-[0.75in] text-slate-900 shadow-lg print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div className="text-xs leading-relaxed uppercase">
            <p className="font-bold">Estado Plurinacional de Bolivia · Ministerio de Educación</p>
            <p>Escuela Superior de Formación de Maestros</p>
            <p className="font-semibold">“Mcal. Andrés de Santa Cruz y Calahumana”</p>
            <p>Unidad Académica Ancocagua</p>
          </div>
          <QRCodeSVG value={urlSeguimiento(h.nro)} size={104} />
        </header>
        <h1 className="mt-6 text-center text-lg font-bold tracking-wide uppercase">Hoja de ruta</h1>
        <p className="text-center text-3xl font-bold tracking-widest">{h.nro}</p>
        <p className="mt-1 text-center text-xs text-slate-500">Consulte el estado en línea escaneando el código QR</p>

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

        <h2 className="mt-8 mb-2 text-sm font-bold uppercase">Pases</h2>
        <table className="w-full border border-slate-900 text-sm">
          <thead>
            <tr className="[&_th]:border [&_th]:border-slate-900 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left">
              <th className="w-28">Fecha</th>
              <th>De</th>
              <th>A</th>
              <th className="w-40">Firma y sello</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }, (_, i) => (
              <tr key={i} className="h-12 [&_td]:border [&_td]:border-slate-900">
                <td />
                <td />
                <td />
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-xs text-slate-500">
          Documento generado por SISET. Cada pase debe registrarse también en el sistema.
        </p>
      </article>
    </div>
  );
}
