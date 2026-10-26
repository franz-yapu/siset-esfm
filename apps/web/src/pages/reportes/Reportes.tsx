import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Link } from 'react-router';
import { Bar, Line } from 'react-chartjs-2';
import '@/lib/graficos';
import { AZUL, AZUL_OSCURO } from '@/lib/graficos';
import type { FiltrosReporte } from '@/types/hojas-ruta';
import { useReporteHojasRuta, useTiposTramite } from '@/hooks/useHojasRuta';
import { useUsuario } from '@/hooks';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import { ahora, diasTexto, fechaHora, hoy } from '@/lib/formato';
import { descargarCsv } from '@/lib/csv';
import { etiquetaMes, filasCsvReporte, filtrosEnTexto, seccionesReporte } from '@/lib/reporte-hojas-ruta';
import { ZonaImpresion } from '@/pages/documentos/Plantillas';
import { ReporteImpreso } from '@/components/reportes/ReporteImpreso';
import { NOMBRE_INSTITUCION } from '@/config/institucion';
import {
  Alerta,
  Button,
  GrillaKpi,
  Card,
  Cargando,
  DataTable,
  EstadoHojaRutaBadge,
  Input,
  KpiCard,
  PageHeader,
  Select,
} from '@/components/ui';

/** P-60 · Reportes (SEC_DIR, COORDINADOR, KARDEX), contra GET /reportes/hojas-ruta (RF-13, DEC-039). */

/** Chart.js corta las etiquetas largas del eje: una etiqueta en arreglo se dibuja en varias líneas. */
const enDosLineas = (texto: string): string | string[] => {
  if (texto.length <= 24) return texto;
  const corte = texto.lastIndexOf(' ', Math.ceil(texto.length / 2));
  return corte > 0 ? [texto.slice(0, corte), texto.slice(corte + 1)] : texto;
};
export function Reportes() {
  const [f, setF] = useState<FiltrosReporte>({});
  const { data: tipos = [] } = useTiposTramite();
  const { data: k, isLoading, error } = useReporteHojasRuta(f);
  const u = useUsuario();
  const set = (p: Partial<FiltrosReporte>) => setF({ ...f, ...p });

  // Impresión y CSV (observación #5 del tutor): las mismas tablas, con los filtros y quién lo generó.
  const secciones = k ? seccionesReporte(k) : [];
  const filtros = filtrosEnTexto(f, tipos);
  const generado = `Generado por ${u.nombre} el ${fechaHora(ahora())}`;
  const exportar = () =>
    descargarCsv(
      `reporte-tramites-${hoy()}.csv`,
      filasCsvReporte([NOMBRE_INSTITUCION, 'Reporte de trámites', filtros, generado], secciones),
    );

  return (
    <>
      <PageHeader
        titulo="Reportes"
        subtitulo="Indicadores de trámites (RF-13)"
        acciones={
          k && (
            <>
              <Button variant="secondary" icon={Download} onClick={exportar}>
                Exportar a Excel
              </Button>
              <Button icon={Printer} onClick={() => window.print()}>
                Imprimir / PDF
              </Button>
            </>
          )
        }
      />
      {k && (
        <ZonaImpresion>
          <ReporteImpreso filtros={filtros} generado={generado} secciones={secciones} />
        </ZonaImpresion>
      )}
      <div className="mb-4 grid gap-3 rounded-[10px] bg-[#f5f7fa] p-3 sm:grid-cols-3">
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
          <GrillaKpi columnas={6}>
            <KpiCard titulo="Total de trámites" valor={k.total} />
            <KpiCard titulo="En curso" valor={k.enCurso} />
            <KpiCard titulo="Entregados" valor={k.entregados} />
            <KpiCard titulo="Devueltos con observación" valor={k.devueltos} />
            <KpiCard
              titulo="Tiempo promedio a la entrega"
              valor={k.tiempoPromedioDias === null ? '—' : `${k.tiempoPromedioDias} d`}
            />
            <KpiCard alerta titulo="Atrasados > 72 horas" valor={k.detenidos.length} />
          </GrillaKpi>
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
                    labels: k.porTipo.map((t) => enDosLineas(t.nombre)),
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
          <Card title={`Trámites atrasados: más de 72 horas sin moverse (${k.detenidos.length})`}>
            <DataTable
              data={k.detenidos}
              rowKey={(h) => h.nro}
              vacio="No hay trámites atrasados"
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
                  sortValue: (h) => h.horas,
                  render: (h) => (
                    <span className="font-semibold text-red-700">
                      {h.dias >= 1 ? diasTexto(h.dias) : `${h.horas} h`}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
