import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, PackageCheck } from 'lucide-react';
import type { EstadoTramite, Entrega, HojaRutaConTitular } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { hojasRutaPrototipoService } from '@/services/hojasRuta-prototipo.service';
import { diasDesde, fecha } from '@/lib/formato';
import { Button, Cargando, PageHeader } from '@/components/ui';
import { ModalEntrega } from '@/components/hojas/ModalEntrega';

const COLUMNAS: { estado: EstadoTramite; titulo: string; color: string }[] = [
  { estado: 'EN_FIRMA', titulo: 'En firma', color: 'border-t-purple-500' },
  { estado: 'LISTO', titulo: 'Listo para entrega', color: 'border-t-lime-500' },
  { estado: 'ENTREGADO', titulo: 'Entregado (últimos 7 días)', color: 'border-t-green-600' },
];

/** P-34 · Firma y entrega: tablero simple En firma → Listo → Entregado. */
export function FirmaEntrega() {
  const u = useUsuario();
  const { ejecutar, ocupado } = useAccion();
  const [entregar, setEntregar] = useState<HojaRutaConTitular | null>(null);
  const { data, loading, reload } = useAsync(() => hojasRutaPrototipoService.listar(), []);
  if (loading && !data) return <Cargando />;
  if (!data) return null;

  const tarjetas = (e: EstadoTramite) =>
    data.filter(
      (h) => h.estado === e && (e !== 'ENTREGADO' || diasDesde(h.movimientos.at(-1)?.fecha ?? h.fechaIngreso) <= 7),
    );
  const listo = async (nro: string) => {
    if (await ejecutar(() => hojasRutaPrototipoService.ejecutar(nro, 'MARCAR_LISTO', u), `${nro} listo para entrega`))
      reload();
  };
  const confirmarEntrega = async (e: Entrega) => {
    if (
      entregar &&
      (await ejecutar(() => hojasRutaPrototipoService.registrarEntrega(entregar.nro, e, u), 'Entrega registrada'))
    ) {
      setEntregar(null);
      reload();
    }
  };

  return (
    <>
      <PageHeader
        titulo="Firma y entrega"
        subtitulo="Trámites que volvieron de Ancocagua: firmas, aviso y entrega al egresado."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNAS.map((c) => {
          const lista = tarjetas(c.estado);
          return (
            <section
              key={c.estado}
              className={`rounded-lg border border-t-4 border-slate-200 bg-slate-100/70 p-3 ${c.color}`}
            >
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                {c.titulo}
                <span className="rounded-full bg-white px-2 text-xs">{lista.length}</span>
              </h2>
              <ul className="space-y-2">
                {lista.length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    Sin trámites
                  </li>
                )}
                {lista.map((h) => (
                  <li key={h.nro} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <Link to={`/hojas-ruta/${h.nro}`} className="font-medium text-slate-900 hover:text-acento">
                      {h.nro}
                    </Link>
                    <p className="text-sm text-slate-600">{h.titular}</p>
                    <p className="text-xs text-slate-500">
                      {h.tipo}
                      {h.entrega
                        ? ` · entregado el ${fecha(h.entrega.fecha)} a ${h.entrega.entregadoA.toLowerCase()}`
                        : ''}
                    </p>
                    {c.estado === 'EN_FIRMA' && (
                      <Button
                        size="sm"
                        className="mt-2"
                        icon={ArrowRight}
                        loading={ocupado}
                        onClick={() => listo(h.nro)}
                      >
                        Marcar como listo
                      </Button>
                    )}
                    {c.estado === 'LISTO' && (
                      <Button
                        size="sm"
                        variant="success"
                        className="mt-2"
                        icon={PackageCheck}
                        onClick={() => setEntregar(h)}
                      >
                        Registrar entrega
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {entregar && (
        <ModalEntrega
          abierto
          nro={entregar.nro}
          ciTitular={entregar.ci}
          onCerrar={() => setEntregar(null)}
          onConfirmar={confirmarEntrega}
        />
      )}
    </>
  );
}
