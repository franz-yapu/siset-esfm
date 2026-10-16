import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, CheckCircle2, Circle, X } from 'lucide-react';
import type { AccionPosible, EstadoHojaRuta, FilaHojaRuta } from '@/types/hojas-ruta';
import type { RequisitoDelFile } from '@/types/requisitos';
import { useToast, useUsuario } from '@/hooks';
import { useBandejasHojasRuta, useHojaRuta, useMutacionHojasRuta } from '@/hooks/useHojasRuta';
import { useRequisitos } from '@/hooks/useRequisitos';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { ErrorApi } from '@/lib/errores';
import { diasDesde, diasTexto, fecha, fechaHora, hoy } from '@/lib/formato';
import { ESTADOS_HR } from '@/config/estados-hoja-ruta';
import { Alerta, Button, Card, Cargando, DataTable, EstadoHojaRutaBadge, PageHeader, Tabs } from '@/components/ui';
import { ConfirmarPaso } from './ConfirmarPaso';
import { ModalEntrega } from './ModalEntrega';
import { textoEntrega } from '@/lib/entrega';
import type { Entrega } from '@/types';

export interface BandejaKardexTab {
  estado: EstadoHojaRuta;
  label: string;
  /** Lo que se muestra en el panel cuando el usuario no tiene un paso que registrar. */
  esperando: string;
  /** Solo las filas que cumplen (p. ej., las firmas de las Direcciones son solo de los trámites con valorado). */
  filtro?: (h: FilaHojaRuta) => boolean;
}

/** Pasos que mueven el documento entre sedes (D-35): quién lo mandó, quién lo recibió y cuándo. */
const PASOS_DE_PASE: Record<string, string> = {
  AVISAR_KARDEX: 'Secretaría avisó a Kardex',
  RECOGER: 'Kardex lo recogió en Calahumana',
  REMITIR: 'Kardex lo remitió a Calahumana',
  RECIBIR_CALAHUMANA: 'Llegó a Calahumana',
};

/**
 * Bandeja de Kardex contra la API (P-43, P-44): una pestaña por estado y, al elegir un trámite, el panel con el
 * file del titular y los pasos que Kardex puede registrar (los manda la API, DEC-033). En el historial, Kardex
 * contrasta las notas con los empastes y puede devolverlo con observación (DEC-053); el file bloqueado impide imprimir.
 */
export function BandejaKardex({
  titulo,
  subtitulo,
  tabs,
  conRequisitos = true,
  mostrarPases = false,
}: {
  titulo: string;
  subtitulo: string;
  tabs: readonly BandejaKardexTab[];
  /** SEC_DIR no lee requisitos (DEC-015): su panel no los muestra. */
  conRequisitos?: boolean;
  /** Bandeja de pases (D-35): el panel muestra los envíos entre sedes. */
  mostrarPases?: boolean;
}) {
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const { data: crudo, isLoading, error } = useBandejasHojasRuta(tabs.map((t) => t.estado));
  if (error) return <Alerta tipo="error">{error.message}</Alerta>;
  const data = crudo?.map((lista, i) => (tabs[i].filtro ? lista.filter(tabs[i].filtro) : lista));
  const filas = data?.[tab] ?? [];
  const actual = filas.find((h) => h.nro === sel) ?? null;

  return (
    <>
      <PageHeader titulo={titulo} subtitulo={subtitulo} />
      <Tabs
        activa={String(tab)}
        onChange={(t) => {
          setTab(Number(t));
          setSel(null);
        }}
        className="mb-4"
        tabs={tabs.map((t, i) => ({ id: String(i), label: t.label, count: data?.[i]?.length ?? 0 }))}
      />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className={actual ? 'xl:col-span-3' : 'xl:col-span-5'}>
          <DataTable
            data={filas}
            loading={isLoading}
            searchable
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
              { key: 'titular', header: 'Titular', render: (h) => h.titular.nombre },
              { key: 'tipo', header: 'Tipo', ocultarEnMovil: true, render: (h) => h.tipo.nombre },
              {
                key: 'valorado',
                header: 'N.º valorado',
                ocultarEnMovil: true,
                render: (h) => h.nroValorado ?? '—',
              },
              {
                key: 'dias',
                header: 'Desde el ingreso',
                sortValue: (h) => diasDesde(h.fechaIngreso),
                render: (h) => diasTexto(diasDesde(h.fechaIngreso)),
              },
            ]}
          />
        </div>
        {actual && (
          <Panel
            key={actual.nro}
            fila={actual}
            esperando={tabs[tab].esperando}
            conRequisitos={conRequisitos}
            mostrarPases={mostrarPases}
            onCerrar={() => setSel(null)}
          />
        )}
      </div>
    </>
  );
}

const ICONO_REQUISITO = {
  COMPLETO: <CheckCircle2 className="size-4 shrink-0 text-green-600" aria-hidden />,
  OBSERVADO: <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden />,
  PENDIENTE: <Circle className="size-4 shrink-0 text-amber-500" aria-hidden />,
} as const;

function Requisitos({ lista }: { lista: RequisitoDelFile[] }) {
  const obligatorios = lista.filter((r) => r.obligatorio && r.aplica);
  if (!obligatorios.length) return <p className="text-sm text-slate-500">Sin requisitos obligatorios cargados.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {obligatorios.map((r) => (
        <li key={r.codigo} className="flex items-center gap-2">
          {ICONO_REQUISITO[r.atrasado ? 'OBSERVADO' : r.estado]}
          <span className={r.estado === 'COMPLETO' ? 'text-slate-700' : 'text-amber-800'}>
            {r.nombre}
            {r.atrasado ? ' (atrasado)' : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Panel lateral: titular, requisitos del file (o los pases) y los pasos que el usuario puede registrar. */
function Panel({
  fila,
  esperando,
  conRequisitos,
  mostrarPases,
  onCerrar,
}: {
  fila: FilaHojaRuta;
  esperando: string;
  conRequisitos: boolean;
  mostrarPases: boolean;
  onCerrar: () => void;
}) {
  const u = useUsuario();
  const toast = useToast();
  const { data: h, isLoading, refetch } = useHojaRuta(fila.nro, u);
  const { data: requisitos, isLoading: cargandoReq } = useRequisitos(fila.titular.fileId, conRequisitos);
  const [paso, setPaso] = useState<AccionPosible | null>(null);
  const [obs, setObs] = useState('');
  const mover = useMutacionHojasRuta((a: { accion: AccionPosible; observacion: string | null }) =>
    hojasRutaService.transicion(fila.nro, a.accion.accion, a.observacion, u),
  );

  const confirmar = async (observacion = obs.trim() || null) => {
    if (!paso) return;
    try {
      const nuevo = await mover.mutateAsync({ accion: paso, observacion });
      toast.success(`${nuevo.nro}: ${ESTADOS_HR[nuevo.estado].etiqueta}`);
      onCerrar();
    } catch (e) {
      if (e instanceof ErrorApi && e.codigo === 'TRANSICION_INVALIDA') {
        toast.error('Alguien más movió este trámite. Se recargó con su estado actual.');
        await refetch();
      } else toast.error(e instanceof Error ? e.message : 'Error');
    }
    setPaso(null);
    setObs('');
  };

  return (
    <Card
      className="xl:col-span-2"
      title={
        <span className="flex items-center gap-2">
          <Link to={`/hojas-ruta/${fila.nro}`} className="hover:underline">
            {fila.nro}
          </Link>
          <EstadoHojaRutaBadge estado={h?.estado ?? fila.estado} />
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
      {isLoading || !h ? (
        <Cargando />
      ) : (
        <>
          <p className="font-medium text-slate-900">{h.titular.nombre}</p>
          <p className="text-sm text-slate-500">
            {h.tipo.nombre} · CI {h.titular.ci}
            {h.nroValorado && ` · valorado ${h.nroValorado}`}
          </p>
          {h.titular.bloqueado && (
            <Alerta tipo="error" className="mt-3">
              El file del titular está bloqueado: el trámite no avanza hasta que Kardex lo desbloquee.
            </Alerta>
          )}
          {mostrarPases && (
            <>
              <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">Envíos entre sedes</h3>
              <ul className="space-y-1.5 text-sm">
                {h.movimientos
                  .filter((m) => m.accion in PASOS_DE_PASE)
                  .map((m) => (
                    <li key={`${m.accion}-${m.fecha}`}>
                      <span className="font-medium text-slate-800">{PASOS_DE_PASE[m.accion]}</span>
                      <span className="text-slate-500">
                        {' '}
                        · {m.usuario.nombre} · {fechaHora(m.fecha)}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
          {conRequisitos && !mostrarPases && (
            <>
              <h3 className="mt-4 mb-2 text-sm font-semibold text-slate-700">Requisitos obligatorios del file</h3>
              {cargandoReq || !requisitos ? <Cargando /> : <Requisitos lista={requisitos} />}
              <Link to={`/files/${h.titular.fileId}`} className="mt-2 inline-block text-sm text-acento hover:underline">
                Abrir el file
              </Link>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {h.acciones.length === 0 && <p className="text-sm text-slate-500">{esperando}</p>}
            {h.acciones.map((a) => (
              <Button
                key={a.accion}
                disabled={Boolean(a.deshabilitada)}
                title={a.deshabilitada ?? undefined}
                onClick={() => setPaso(a)}
              >
                {a.etiqueta}
              </Button>
            ))}
          </div>
        </>
      )}
      {paso?.accion === 'ENTREGAR' && (
        <ModalEntrega
          abierto
          nro={fila.nro}
          ciTitular={fila.titular.ci}
          onCerrar={() => setPaso(null)}
          onConfirmar={(e: Entrega) => {
            // Como en el detalle: si la entrega fue otro día, la fecha va en la observación (DEC-046).
            const dia = e.fecha.slice(0, 10);
            return confirmar(`${textoEntrega(e)}${dia === hoy() ? '' : ` el ${fecha(dia)}`}`);
          }}
        />
      )}
      <ConfirmarPaso
        paso={paso && paso.accion !== 'ENTREGAR' ? paso : null}
        nro={fila.nro}
        titular={fila.titular.nombre}
        nroValorado={fila.nroValorado}
        obs={obs}
        onObs={setObs}
        cargando={mover.isPending}
        onCerrar={() => setPaso(null)}
        onConfirmar={() => void confirmar()}
      />
    </Card>
  );
}
