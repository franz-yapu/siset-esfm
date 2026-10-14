import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Circle, Send, X } from 'lucide-react';
import type { HojaRutaConTitular } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { filesPrototipoService } from '@/services/files-prototipo.service';
import { CODIGOS_REQUISITO, NOMBRE_REQUISITO } from '@/lib/reglas';
import { diasDesde, diasTexto } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoBadge, PageHeader, Semaforo, Tabs } from '@/components/ui';
import { ModalObservar } from '@/components/hojas/ModalObservar';

const TABS = [
  { id: 'recibidos', label: 'Recibidos', filtro: (h: HojaRutaConTitular) => h.estado === 'RECIBIDO' },
  {
    id: 'revision',
    label: 'En revisión',
    filtro: (h: HojaRutaConTitular) => h.estado === 'EN_REVISION' && !h.enviadoDictamen,
  },
  { id: 'observados', label: 'Observados', filtro: (h: HojaRutaConTitular) => h.estado === 'OBSERVADO' },
  {
    id: 'dictamen',
    label: 'Enviados a dictamen',
    filtro: (h: HojaRutaConTitular) => h.estado === 'EN_REVISION' && Boolean(h.enviadoDictamen),
  },
];

/** P-43 · Revisión de trámites (KARDEX). */
export function Revision() {
  const [tab, setTab] = useState('recibidos');
  const [sel, setSel] = useState<string | null>(null);
  const { data = [], loading, reload } = useAsync(() => hojasRutaService.listar(), []);
  const filtro = TABS.find((t) => t.id === tab)?.filtro ?? (() => true);
  const filas = data.filter(filtro);
  const actual = filas.find((h) => h.nro === sel) ?? null;

  return (
    <>
      <PageHeader titulo="Revisión de trámites" subtitulo="Clic en un trámite para ver su checklist de requisitos." />
      <Tabs
        activa={tab}
        onChange={(t) => {
          setTab(t);
          setSel(null);
        }}
        className="mb-4"
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: data.filter(t.filtro).length }))}
      />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className={actual ? 'xl:col-span-3' : 'xl:col-span-5'}>
          <DataTable
            data={filas}
            loading={loading}
            rowKey={(h) => h.nro}
            onRowClick={(h) => setSel(h.nro)}
            resaltar={(h) => h.nro === sel}
            vacio="No hay trámites en esta bandeja"
            columns={[
              {
                key: 'nro',
                header: 'N.º HR',
                principal: true,
                render: (h) => <span className="font-medium">{h.nro}</span>,
              },
              { key: 'titular', header: 'Titular' },
              { key: 'tipo', header: 'Tipo', ocultarEnMovil: true },
              { key: 'sem', header: 'File', render: (h) => <Semaforo color={h.semaforo} size="sm" /> },
              {
                key: 'dias',
                header: 'En la etapa',
                sortValue: (h) => diasDesde(h.movimientos.at(-1)?.fecha ?? h.fechaIngreso),
                render: (h) => diasTexto(diasDesde(h.movimientos.at(-1)?.fecha ?? h.fechaIngreso)),
              },
            ]}
          />
        </div>
        {actual && (
          <PanelRevision
            key={actual.nro + actual.estado + actual.movimientos.length}
            h={actual}
            onCerrar={() => setSel(null)}
            onCambio={reload}
          />
        )}
      </div>
    </>
  );
}

/** Panel lateral: checklist de requisitos + acciones de Kardex. */
function PanelRevision({
  h,
  onCerrar,
  onCambio,
}: {
  h: HojaRutaConTitular;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const u = useUsuario();
  const { ejecutar, ocupado } = useAccion();
  const [observar, setObservar] = useState(false);
  const { data: f, loading } = useAsync(() => filesPrototipoService.obtener(h.fileId), [h.fileId]);
  const acciones = hojasRutaService.acciones(h.nro, u);
  const correr = async (accion: (typeof acciones)[number]['accion'], obs?: string) => {
    if (
      await ejecutar(
        () => hojasRutaService.ejecutar(h.nro, accion, u, { obs }),
        `${h.nro}: ${acciones.find((a) => a.accion === accion)?.etiqueta}`,
      )
    ) {
      setObservar(false);
      onCambio();
    }
  };

  return (
    <Card
      className="xl:col-span-2"
      title={
        <span className="flex items-center gap-2">
          {h.nro}
          <EstadoBadge estado={h.estado} />
        </span>
      }
      actions={
        <button
          type="button"
          onClick={onCerrar}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Cerrar panel"
        >
          <X className="size-4" />
        </button>
      }
    >
      {loading || !f ? (
        <Cargando />
      ) : (
        <>
          <p className="font-medium text-slate-900">{h.titular}</p>
          <p className="text-sm text-slate-500">
            {h.tipo} · CI {h.ci}
          </p>
          {f.bloqueado && (
            <Alerta tipo="error" className="mt-3">
              File bloqueado: {f.motivoBloqueo}
            </Alerta>
          )}
          <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">Checklist de requisitos</h3>
          <ul className="space-y-1.5 text-sm">
            {CODIGOS_REQUISITO.map((c) => {
              const ok = f.requisitos[c].estado === 'COMPLETO';
              return (
                <li key={c} className="flex items-center gap-2">
                  {ok ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <Circle className="size-4 text-amber-500" />
                  )}
                  <span className={ok ? 'text-slate-700' : 'text-amber-800'}>{NOMBRE_REQUISITO[c]}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-2">
              {f.bloqueado ? (
                <Circle className="size-4 text-red-600" />
              ) : (
                <CheckCircle2 className="size-4 text-green-600" />
              )}
              <span>Sin UF reprobadas sobre el límite</span>
            </li>
          </ul>
          <Link to={`/files/${f.id}`} className="mt-2 inline-block text-sm text-acento hover:underline">
            Abrir file para registrar requisitos
          </Link>
          {h.estado === 'OBSERVADO' && (
            <Alerta tipo="aviso" className="mt-3">
              {h.movimientos.at(-1)?.obs}
            </Alerta>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {acciones.length === 0 && <p className="text-sm text-slate-500">Esperando el dictamen del Coordinador.</p>}
            {acciones.map((a) => (
              <Button
                key={a.accion}
                loading={ocupado}
                variant={a.accion === 'OBSERVAR' ? 'danger' : 'primary'}
                icon={a.accion === 'ENVIAR_DICTAMEN' ? Send : undefined}
                disabled={Boolean(a.deshabilitada)}
                title={a.deshabilitada ?? undefined}
                onClick={() => (a.accion === 'OBSERVAR' ? setObservar(true) : correr(a.accion))}
              >
                {a.etiqueta}
              </Button>
            ))}
          </div>
          {acciones.find((a) => a.deshabilitada) && (
            <p className="mt-2 text-xs text-red-700">
              {acciones.find((a) => a.deshabilitada)?.deshabilitada}: no se puede enviar a dictamen.
            </p>
          )}
          {observar && (
            <ModalObservar
              abierto
              file={f}
              onCerrar={() => setObservar(false)}
              onConfirmar={(m) => correr('OBSERVAR', m)}
            />
          )}
        </>
      )}
    </Card>
  );
}
