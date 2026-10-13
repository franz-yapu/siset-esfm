import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import type { Entrega } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { filesService } from '@/services/files.service';
import type { Accion } from '@/lib/transiciones';
import { nombreSede } from '@/config/catalogos';
import { ESTADOS } from '@/config/estados';
import { alertasFile, semaforoFile } from '@/lib/reglas';
import { fecha } from '@/lib/formato';
import { urlSeguimiento } from '@/lib/qr';
import { Alerta, Button, Card, Cargando, EstadoBadge, PageHeader, Semaforo, Timeline } from '@/components/ui';
import { ModalObservar } from '@/components/hojas/ModalObservar';
import { ModalEntrega } from '@/components/hojas/ModalEntrega';
import { Confirmar } from '@/components/hojas/Confirmar';

/** Acciones que abren otra pantalla en vez de ejecutarse aquí. */
const NAVEGAN: Partial<Record<Accion, (nro: string) => string>> = {
  DICTAMINAR: (nro) => `/dictamenes/${nro}`,
  EMITIR: () => '/emision',
};

/** P-31 · Detalle de la hoja de ruta: datos + timeline + acción permitida según estado y rol. */
export function DetalleHojaRuta() {
  const { nro = '' } = useParams();
  const u = useUsuario();
  const nav = useNavigate();
  const { ejecutar, ocupado } = useAccion();
  const [modal, setModal] = useState<Accion | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const h = await hojasRutaService.obtener(nro);
    return { h, f: await filesService.obtener(h.fileId) };
  }, [nro]);

  if (loading && !data) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error}</Alerta>;
  const { h, f } = data;
  const acciones = hojasRutaService.acciones(nro, u);

  const correr = async (accion: Accion, obs?: string) => {
    const ok = await ejecutar(
      () => hojasRutaService.ejecutar(nro, accion, u, { obs }),
      `Acción realizada: ${acciones.find((a) => a.accion === accion)?.etiqueta}`,
    );
    if (ok) {
      setModal(null);
      reload();
    }
  };
  const entregar = async (e: Entrega) => {
    if (await ejecutar(() => hojasRutaService.registrarEntrega(nro, e, u), 'Entrega registrada')) {
      setModal(null);
      reload();
    }
  };
  const pulsar = (accion: Accion) => {
    const destino = NAVEGAN[accion];
    if (destino) nav(destino(nro));
    else setModal(accion);
  };
  const etiqueta = modal ? (acciones.find((a) => a.accion === modal)?.etiqueta ?? '') : '';
  const ultimaObs = h.estado === 'OBSERVADO' ? h.movimientos.at(-1)?.obs : undefined;

  return (
    <>
      <PageHeader
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {h.nro}
            <EstadoBadge estado={h.estado} className="text-sm" />
          </span>
        }
        subtitulo={`${h.tipo} · ingresó el ${fecha(h.fechaIngreso)}${h.enviadoDictamen ? ' · enviado a dictamen' : ''}`}
        acciones={
          <Link
            to={`/hojas-ruta/${h.nro}/caratula`}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            <Printer className="size-4" />
            Carátula
          </Link>
        }
      />

      {acciones.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
          <span className="mr-2 text-sm text-sky-900">Acción disponible:</span>
          {acciones.map((a) => (
            <Button
              key={a.accion}
              variant={a.accion === 'OBSERVAR' ? 'secondary' : 'primary'}
              disabled={Boolean(a.deshabilitada)}
              title={a.deshabilitada ?? undefined}
              onClick={() => pulsar(a.accion)}
            >
              {a.etiqueta}
            </Button>
          ))}
          {acciones.some((a) => a.deshabilitada) && (
            <span className="text-xs text-red-700">{acciones.find((a) => a.deshabilitada)?.deshabilitada}</span>
          )}
        </div>
      )}
      {ultimaObs && (
        <Alerta tipo="aviso" titulo="Trámite observado" className="mb-4">
          {ultimaObs}
        </Alerta>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Datos del trámite">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Tipo</dt>
                <dd>{h.tipo}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">N.º de valorado</dt>
                <dd>{h.nroValorado ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Sede actual</dt>
                <dd>{nombreSede(h.sedeActualId)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Estado</dt>
                <dd>{ESTADOS[h.estado].etiqueta}</dd>
              </div>
              {h.entrega && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Entrega</dt>
                  <dd>
                    {h.entrega.entregadoA} · CI {h.entrega.ciReceptor} · {fecha(h.entrega.fecha)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
          <Card
            title="Titular"
            actions={
              <Link to={`/files/${f.id}`} className="text-sm text-acento hover:underline">
                Ver file
              </Link>
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">{h.titular}</p>
                <p className="text-slate-500">
                  CI {h.ci} · {f.codigo}
                </p>
                <p className="text-slate-500">{f.especialidad}</p>
                <Semaforo color={semaforoFile(f)} className="mt-2" />
                <ul className="mt-1 text-xs text-slate-500">
                  {alertasFile(f).map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0 rounded border border-slate-200 p-1.5" title="QR de seguimiento">
                <QRCodeSVG value={urlSeguimiento(h.nro)} size={84} />
              </div>
            </div>
          </Card>
        </div>
        <Card title="Línea de tiempo" className="lg:col-span-3">
          <Timeline movimientos={h.movimientos} />
        </Card>
      </div>

      {modal === 'OBSERVAR' && (
        <ModalObservar abierto file={f} onCerrar={() => setModal(null)} onConfirmar={(m) => correr('OBSERVAR', m)} />
      )}
      {modal === 'ENTREGAR' && (
        <ModalEntrega abierto nro={h.nro} ciTitular={h.ci} onCerrar={() => setModal(null)} onConfirmar={entregar} />
      )}
      <Confirmar
        abierto={modal !== null && modal !== 'OBSERVAR' && modal !== 'ENTREGAR'}
        titulo={etiqueta}
        cargando={ocupado}
        onCerrar={() => setModal(null)}
        onConfirmar={() => modal && correr(modal)}
      >
        ¿Confirmas <strong>{etiqueta.toLowerCase()}</strong> para el trámite {h.nro} de {h.titular}? Quedará registrado
        en el historial y en la bitácora.
      </Confirmar>
    </>
  );
}
