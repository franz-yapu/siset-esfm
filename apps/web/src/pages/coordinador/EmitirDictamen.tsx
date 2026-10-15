import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, CheckCircle2, PenLine } from 'lucide-react';
import clsx from 'clsx';
import type { Dictamen } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { hojasRutaPrototipoService } from '@/services/hojasRuta-prototipo.service';
import { filesPrototipoService } from '@/services/files-prototipo.service';
import { dictamenesService } from '@/services/dictamenes.service';
import { fileHabilitado, requisitosPendientes } from '@/lib/reglas';
import { ESTADOS } from '@/config/estados';
import { Alerta, Button, Card, Cargando, PageHeader, Tabs, Textarea, Timeline } from '@/components/ui';
import { TablaRequisitos, TablaResultados } from '@/components/file/TablasFile';
import { CabeceraFile, cabeceraDePrototipo } from '@/components/file/CabeceraFile';

/** P-51 · Emitir dictamen (COORDINADOR). */
export function EmitirDictamen() {
  const { nro = '' } = useParams();
  const u = useUsuario();
  const nav = useNavigate();
  const { ejecutar, ocupado } = useAccion();
  const [resultado, setResultado] = useState<Dictamen['resultado'] | null>(null);
  const [obs, setObs] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [tab, setTab] = useState('requisitos');
  const { data, loading, error } = useAsync(async () => {
    const h = await hojasRutaPrototipoService.obtener(nro);
    return { h, f: await filesPrototipoService.obtener(h.fileId) };
  }, [nro]);

  if (loading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error}</Alerta>;
  const { h, f } = data;
  const pendiente = h.estado === 'EN_REVISION' && h.enviadoDictamen;
  const aprobable = fileHabilitado(f);
  const faltaObs = resultado === 'OBSERVADO' && !obs.trim();

  const firmar = async () => {
    setEnviado(true);
    if (!resultado || faltaObs) return;
    if (
      await ejecutar(
        () => dictamenesService.emitir(nro, resultado, obs, u),
        resultado === 'APROBADO' ? 'Dictamen aprobado y firmado' : 'Trámite observado: vuelve a Kardex',
      )
    ) {
      nav('/dictamenes');
    }
  };

  return (
    <>
      <PageHeader titulo={`Dictamen · ${h.nro}`} subtitulo={`${h.tipo} · ${h.titular}`} />
      {!pendiente && (
        <Alerta tipo="info" className="mb-4">
          Este trámite no está esperando dictamen (estado actual: {ESTADOS[h.estado].etiqueta}).
        </Alerta>
      )}
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="min-w-0 space-y-4 xl:col-span-3">
          <CabeceraFile file={cabeceraDePrototipo(f)} />
          <Card>
            <Tabs
              activa={tab}
              onChange={setTab}
              className="mb-4"
              tabs={[
                { id: 'requisitos', label: 'Requisitos', count: requisitosPendientes(f).length || undefined },
                { id: 'resultados', label: 'Resultados anuales' },
                { id: 'timeline', label: 'Línea de tiempo' },
              ]}
            />
            {tab === 'requisitos' && <TablaRequisitos file={f} />}
            {tab === 'resultados' && <TablaResultados file={f} />}
            {tab === 'timeline' && <Timeline movimientos={h.movimientos} />}
          </Card>
        </div>

        <Card title="Dictamen" className="h-fit xl:sticky xl:top-20 xl:col-span-2">
          {!aprobable && (
            <Alerta tipo="error" className="mb-4">
              {f.bloqueado ? 'El file está bloqueado' : 'El file tiene requisitos pendientes'}: solo puedes observar el
              trámite.
            </Alerta>
          )}
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Resultado del dictamen">
            {(
              [
                {
                  v: 'APROBADO',
                  t: 'Aprobado',
                  icono: CheckCircle2,
                  on: 'border-green-600 bg-green-50 text-green-800',
                  des: !aprobable,
                },
                {
                  v: 'OBSERVADO',
                  t: 'Observado',
                  icono: AlertTriangle,
                  on: 'border-amber-500 bg-amber-50 text-amber-800',
                  des: false,
                },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={resultado === o.v}
                disabled={o.des || !pendiente}
                onClick={() => setResultado(o.v)}
                className={clsx(
                  'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
                  resultado === o.v ? o.on : 'border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                <o.icono className="size-7" />
                {o.t}
              </button>
            ))}
          </div>
          {enviado && !resultado && <p className="mt-2 text-xs text-red-600">Elige Aprobado u Observado</p>}
          <Textarea
            className="mt-4"
            label={`Observaciones${resultado === 'OBSERVADO' ? ' (obligatorio)' : ''}`}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            error={enviado && faltaObs ? 'Indica qué debe subsanarse' : null}
            disabled={!pendiente}
          />
          <Button className="mt-4 w-full" icon={PenLine} loading={ocupado} disabled={!pendiente} onClick={firmar}>
            Firmar dictamen
          </Button>
        </Card>
      </div>
    </>
  );
}
