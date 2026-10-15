import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { Lock, Printer } from 'lucide-react';
import type { Entrega } from '@/types';
import type { AccionPosible, DetalleHojaRuta as Detalle } from '@/types/hojas-ruta';
import { useToast, useUsuario } from '@/hooks';
import { useHojaRuta, useMutacionHojasRuta } from '@/hooks/useHojasRuta';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import { ErrorApi } from '@/lib/errores';
import { fecha, hoy } from '@/lib/formato';
import { urlSeguimiento } from '@/lib/qr';
import {
  Alerta,
  Button,
  Card,
  Cargando,
  EstadoHojaRutaBadge,
  PageHeader,
  Textarea,
  Timeline,
  type PasoTimeline,
} from '@/components/ui';
import { ModalEntrega } from '@/components/hojas/ModalEntrega';
import { Confirmar } from '@/components/hojas/Confirmar';

const pasosDe = (h: Detalle): PasoTimeline[] =>
  h.movimientos.map((m) => ({
    etiqueta: ESTADOS_HR[m.estadoNuevo].etiqueta,
    punto: ESTADOS_HR[m.estadoNuevo].punto,
    fecha: m.fecha,
    sede: sedeHr(m.sede),
    usuario: m.usuario.nombre,
    obs: m.observacion,
  }));

/** P-31 · Detalle de la hoja de ruta contra la API (SDD S3.8-S3.9 §2.5). Las acciones las manda la API. */
export function DetalleHojaRuta() {
  const { nro = '' } = useParams();
  const u = useUsuario();
  const toast = useToast();
  const { data: h, isLoading, error, refetch } = useHojaRuta(nro, u);
  const [modal, setModal] = useState<AccionPosible | null>(null);
  const [obs, setObs] = useState('');
  const mover = useMutacionHojasRuta((a: { accion: AccionPosible; observacion: string | null }) =>
    hojasRutaService.transicion(nro, a.accion.accion, a.observacion, u),
  );

  if (isLoading) return <Cargando />;
  if (error || !h) return <Alerta tipo="error">{error?.message ?? 'Trámite no encontrado'}</Alerta>;

  const correr = async (accion: AccionPosible, observacion: string | null) => {
    try {
      const nuevo = await mover.mutateAsync({ accion, observacion });
      toast.success(`${nuevo.nro}: ${ESTADOS_HR[nuevo.estado].etiqueta}`);
      setModal(null);
      setObs('');
    } catch (e) {
      const err = e instanceof ErrorApi ? e : null;
      if (err?.codigo === 'TRANSICION_INVALIDA') {
        toast.error('Alguien más movió este trámite. Se recargó con su estado actual.');
        setModal(null);
        await refetch();
      } else toast.error(e instanceof Error ? e.message : 'Error');
    }
  };
  // El paso queda con la hora en que se registra; si la entrega fue otro día, la fecha va en la observación (DEC-046).
  const entregar = (e: Entrega) => {
    const dia = e.fecha.slice(0, 10);
    const cuando = dia === hoy() ? '' : ` el ${fecha(dia)}`;
    return modal
      ? correr(modal, `Entregado a ${e.entregadoA.toLowerCase()} (CI ${e.ciReceptor.trim()})${cuando}`)
      : Promise.resolve();
  };

  return (
    <>
      <PageHeader
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {h.nro}
            <EstadoHojaRutaBadge estado={h.estado} className="text-sm" />
          </span>
        }
        subtitulo={`${h.tipo.nombre} · ingresó el ${fecha(h.fechaIngreso)}`}
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

      {h.acciones.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
          <span className="mr-2 text-sm text-sky-900">Acción disponible:</span>
          {h.acciones.map((a) => (
            <Button
              key={a.accion}
              disabled={Boolean(a.deshabilitada)}
              title={a.deshabilitada ?? undefined}
              onClick={() => setModal(a)}
            >
              {a.etiqueta}
            </Button>
          ))}
          {h.acciones.some((a) => a.deshabilitada) && (
            <span className="text-xs text-red-700">{h.acciones.find((a) => a.deshabilitada)?.deshabilitada}</span>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Datos del trámite">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Tipo</dt>
                <dd>{h.tipo.nombre}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">N.º de valorado</dt>
                <dd>{h.nroValorado ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Sede actual</dt>
                <dd>{sedeHr(h.sedeActual.codigo)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Estado</dt>
                <dd>{ESTADOS_HR[h.estado].etiqueta}</dd>
              </div>
              {h.fechaCierre && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Entregado</dt>
                  <dd>{fecha(h.fechaCierre)}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card
            title="Titular"
            actions={
              <Link to={`/files/${h.titular.fileId}`} className="text-sm text-acento hover:underline">
                Ver file
              </Link>
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">{h.titular.nombre}</p>
                <p className="text-slate-500">CI {h.titular.ci}</p>
                {h.titular.bloqueado && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700">
                    <Lock className="size-3.5" aria-hidden />
                    File bloqueado
                  </p>
                )}
              </div>
              <div className="shrink-0 rounded border border-slate-200 p-1.5" title="QR de seguimiento">
                <QRCodeSVG value={urlSeguimiento(h.nro)} size={84} />
              </div>
            </div>
          </Card>
        </div>
        <Card title="Línea de tiempo" className="lg:col-span-3">
          <Timeline pasos={pasosDe(h)} />
        </Card>
      </div>

      {modal?.accion === 'ENTREGAR' && (
        <ModalEntrega
          abierto
          nro={h.nro}
          ciTitular={h.titular.ci}
          onCerrar={() => setModal(null)}
          onConfirmar={entregar}
        />
      )}
      <Confirmar
        abierto={modal !== null && modal.accion !== 'ENTREGAR'}
        titulo={modal?.etiqueta ?? ''}
        cargando={mover.isPending}
        onCerrar={() => setModal(null)}
        onConfirmar={() => modal && correr(modal, obs.trim() || null)}
      >
        <p>
          ¿Confirmas <strong>{modal?.etiqueta.toLowerCase()}</strong> para el trámite {h.nro} de {h.titular.nombre}?
          Quedará registrado en el historial y en la bitácora.
        </p>
        <Textarea
          className="mt-3"
          label="Observación (opcional)"
          value={obs}
          maxLength={255}
          onChange={(e) => setObs(e.target.value)}
        />
      </Confirmar>
    </>
  );
}
