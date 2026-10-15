import { useState } from 'react';
import { Link } from 'react-router';
import { Bar, Line } from 'react-chartjs-2';
import { AlertTriangle, CheckCircle2, Clock, Layers, Loader } from 'lucide-react';
import '@/lib/graficos';
import { AZUL, AZUL_OSCURO } from '@/lib/graficos';
import type { FiltrosReporte } from '@/types/hojas-ruta';
import { useReporteHojasRuta, useTiposTramite } from '@/hooks/useHojasRuta';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import { diasTexto } from '@/lib/formato';
import {
  Alerta,
  Card,
  Cargando,
  DataTable,
  EstadoHojaRutaBadge,
  Input,
  KpiCard,
  PageHeader,
  Select,
} from '@/components/ui';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etiquetaMes = (aaaaMm: string) => `${MESES[Number(aaaaMm.slice(5, 7)) - 1]} ${aaaaMm.slice(2, 4)}`;

/** P-60 · Reportes (SEC_DIR, COORDINADOR, KARDEX), contra GET /reportes/hojas-ruta (RF-13, DEC-039). */
export function Reportes() {
  const [f, setF] = useState<FiltrosReporte>({});
  const { data: tipos = [] } = useTiposTramite();
  const { data: k, isLoading, error } = useReporteHojasRuta(f);
  const set = (p: Partial<FiltrosReporte>) => setF({ ...f, ...p });

  return (
    <>
      <PageHeader titulo="Reportes" subtitulo="Indicadores de trámites (RF-13)" />
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <Input
          label="Ingreso desde"
          type="date"
          value={f.desde ?? ''}
          onChange={(e) => set({ desde: e.target.value || undefined })}
        />
        <Input
          label="Ingreso hasta"
          type="date"
          value={f.hasta ?? ''}
          onChange={(e) => set({ hasta: e.target.value || undefined })}
        />
        <Select
          label="Tipo de trámite"
          value={f.tipoTramite ?? ''}
          onChange={(e) => set({ tipoTramite: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.nombre}
            </option>
          ))}
        </Select>
      </div>

      {error && <Alerta tipo="error">{error.message}</Alerta>}
      {isLoading || !k ? (
        !error && <Cargando />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
            <KpiCard titulo="Total de trámites" valor={k.total} icono={Layers} />
            <KpiCard titulo="En curso" valor={k.enCurso} icono={Loader} color="violeta" />
            <KpiCard titulo="Entregados" valor={k.entregados} icono={CheckCircle2} color="verde" />
            <KpiCard
              titulo="Tiempo promedio a la entrega"
              valor={k.tiempoPromedioDias === null ? '—' : `${k.tiempoPromedioDias} d`}
              icono={Clock}
              color="gris"
            />
            <KpiCard titulo="Detenidos > 10 días" valor={k.detenidos.length} icono={AlertTriangle} color="rojo" />
          </div>
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <Card title="Trámites por estado">
              <div className="h-72">
                <Bar
                  data={{
                    labels: k.porEstado.map((e) => ESTADOS_HR[e.estado].etiqueta),
                    datasets: [
                      {
                        label: 'Trámites',
                        data: k.porEstado.map((e) => e.total),
                        backgroundColor: AZUL,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { ticks: { precision: 0 } } },
                  }}
                />
              </div>
            </Card>
            <Card title="Ingresados por mes (últimos 6 meses)">
              <div className="h-72">
                <Line
                  data={{
                    labels: k.porMes.map((m) => etiquetaMes(m.mes)),
                    datasets: [
                      {
                        label: 'Ingresados',
                        data: k.porMes.map((m) => m.total),
                        borderColor: AZUL_OSCURO,
                        backgroundColor: 'rgba(46,117,182,0.12)',
                        fill: true,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              </div>
            </Card>
            <Card title="Tiempo promedio en cada estado (días)">
              <div className="h-64">
                <Bar
                  data={{
                    labels: k.porEtapa.map((e) => ESTADOS_HR[e.estado].etiqueta),
                    datasets: [
                      {
                        label: 'Días',
                        data: k.porEtapa.map((e) => e.dias),
                        backgroundColor: AZUL_OSCURO,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } },
                  }}
                />
              </div>
            </Card>
            <Card title="Trámites por tipo">
              <div className="h-64">
                <Bar
                  data={{
                    labels: k.porTipo.map((t) => t.nombre),
                    datasets: [
                      {
                        label: 'Trámites',
                        data: k.porTipo.map((t) => t.total),
                        backgroundColor: AZUL,
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { ticks: { precision: 0 } } },
                  }}
                />
              </div>
            </Card>
          </div>
          <Card title={`Trámites detenidos más de 10 días (${k.detenidos.length})`}>
            <DataTable
              data={k.detenidos}
              rowKey={(h) => h.nro}
              vacio="No hay trámites detenidos"
              columns={[
                {
                  key: 'nro',
                  header: 'N.º HR',
                  principal: true,
                  render: (h) => (
                    <Link to={`/hojas-ruta/${h.nro}`} className="font-medium text-acento hover:underline">
                      {h.nro}
                    </Link>
                  ),
                },
                { key: 'titular', header: 'Titular' },
                { key: 'estado', header: 'Estado', render: (h) => <EstadoHojaRutaBadge estado={h.estado} /> },
                { key: 'sede', header: 'Sede', render: (h) => sedeHr(h.sedeActual) },
                {
                  key: 'dias',
                  header: 'Sin movimiento',
                  sortValue: (h) => h.dias,
                  render: (h) => <span className="font-semibold text-red-700">{diasTexto(h.dias)}</span>,
                },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
