import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { AlertTriangle, CheckCircle2, Clock, FileDown, FileSpreadsheet, Layers, Loader } from 'lucide-react';
import '@/lib/graficos';
import { AZUL, AZUL_OSCURO } from '@/lib/graficos';
import type { TipoTramite } from '@/types';
import { useAsync, useToast } from '@/hooks';
import { reportesService, type FiltrosReporte } from '@/services/reportes.service';
import { ESTADOS } from '@/config/estados';
import { SEDES, TIPOS_TRAMITE, sedeCorta } from '@/config/catalogos';
import { diasTexto } from '@/lib/formato';
import { Button, Card, Cargando, DataTable, EstadoBadge, Input, KpiCard, PageHeader, Select } from '@/components/ui';

/** P-60 · Reportes (SEC_DIR, COORDINADOR, KARDEX). */
export function Reportes() {
  const toast = useToast();
  const [f, setF] = useState<FiltrosReporte>({ desde: '', hasta: '', sedeId: '', tipo: '' });
  const { data, loading } = useAsync(
    () =>
      Promise.all([
        reportesService.kpis(f),
        reportesService.porEstado(f),
        reportesService.porMes(f),
        reportesService.tiempoPorEtapa(f),
        reportesService.detenidos(f),
      ]),
    [f.desde, f.hasta, f.sedeId, f.tipo],
  );
  const set = (p: Partial<FiltrosReporte>) => setF({ ...f, ...p });

  return (
    <>
      <PageHeader
        titulo="Reportes"
        subtitulo="Indicadores de trámites (RF-13)"
        acciones={
          <>
            <Button
              variant="secondary"
              icon={FileDown}
              onClick={() => toast.success('Reporte PDF generado (simulado)')}
            >
              Exportar PDF
            </Button>
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => toast.success('Reporte Excel generado (simulado)')}
            >
              Exportar Excel
            </Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Desde" type="date" value={f.desde} onChange={(e) => set({ desde: e.target.value })} />
        <Input label="Hasta" type="date" value={f.hasta} onChange={(e) => set({ hasta: e.target.value })} />
        <Select
          label="Sede actual"
          value={f.sedeId}
          onChange={(e) => set({ sedeId: e.target.value ? Number(e.target.value) : '' })}
        >
          <option value="">Todas</option>
          {SEDES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Tipo de trámite"
          value={f.tipo}
          onChange={(e) => set({ tipo: e.target.value as TipoTramite | '' })}
        >
          <option value="">Todos</option>
          {TIPOS_TRAMITE.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </div>

      {loading && !data ? (
        <Cargando />
      ) : (
        data &&
        (() => {
          const [k, porEstado, porMes, etapas, detenidos] = data;
          return (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-5">
                <KpiCard titulo="Total de trámites" valor={k.total} icono={Layers} />
                <KpiCard titulo="En curso" valor={k.enCurso} icono={Loader} color="violeta" />
                <KpiCard titulo="Entregados" valor={k.entregados} icono={CheckCircle2} color="verde" />
                <KpiCard titulo="Tiempo promedio" valor={`${k.tiempoPromedio} d`} icono={Clock} color="gris" />
                <KpiCard titulo="Detenidos > 10 días" valor={k.detenidos} icono={AlertTriangle} color="rojo" />
              </div>
              <div className="mb-4 grid gap-4 lg:grid-cols-2">
                <Card title="Trámites por estado">
                  <div className="h-72">
                    <Bar
                      data={{
                        labels: porEstado.map((e) => ESTADOS[e.estado].etiqueta),
                        datasets: [
                          {
                            label: 'Trámites',
                            data: porEstado.map((e) => e.total),
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
                        labels: porMes.map((m) => m.mes),
                        datasets: [
                          {
                            label: 'Ingresados',
                            data: porMes.map((m) => m.total),
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
                <Card title="Tiempo promedio por etapa (días)" className="lg:col-span-2">
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: etapas.map((e) => e.etapa),
                        datasets: [
                          {
                            label: 'Días',
                            data: etapas.map((e) => e.dias),
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
              </div>
              <Card title={`Trámites detenidos más de 10 días (${detenidos.length})`}>
                <DataTable
                  data={detenidos}
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
                    { key: 'estado', header: 'Estado', render: (h) => <EstadoBadge estado={h.estado} /> },
                    { key: 'sede', header: 'Sede', render: (h) => sedeCorta(h.sedeActualId) },
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
          );
        })()
      )}
    </>
  );
}
