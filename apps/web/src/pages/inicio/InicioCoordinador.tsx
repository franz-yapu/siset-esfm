import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { AlertTriangle, CheckCircle2, Clock, Gavel } from 'lucide-react';
import '@/lib/graficos';
import { AZUL } from '@/lib/graficos';
import { useAsync, useUsuario } from '@/hooks';
import { reportesService } from '@/services/reportes.service';
import { dictamenesService } from '@/services/dictamenes.service';
import { ESTADOS } from '@/config/estados';
import { diasDesde, diasTexto } from '@/lib/formato';
import { Button, Card, Cargando, DataTable, KpiCard, Semaforo } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

/** P-14 · Inicio Coordinador. */
export function InicioCoordinador() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data, loading } = useAsync(() => Promise.all([reportesService.resumenInicio(), dictamenesService.pendientes(), reportesService.porEstado()]), []);
  if (loading || !data) return <Cargando />;
  const [r, pendientes, porEstado] = data;

  return (
    <>
      <Saludo nombre={u.nombre}>Coordinación Académica · UA Ancocagua</Saludo>
      <GrillaKpi>
        <KpiCard titulo="Pendientes de dictamen" valor={r.pendientesDictamen} icono={Gavel} color="violeta" to="/dictamenes" />
        <KpiCard titulo="Observados" valor={r.observados} icono={AlertTriangle} color="ambar" />
        <KpiCard titulo="Dictaminados este mes" valor={r.dictaminadosMes} icono={CheckCircle2} color="verde" />
        <KpiCard titulo="Tiempo promedio del trámite" valor={`${r.tiempoPromedio} d`} icono={Clock} color="gris" />
      </GrillaKpi>
      <div className="grid gap-4 xl:grid-cols-5">
        <Card title="Pendientes de dictamen (más antiguos primero)" className="xl:col-span-3">
          <DataTable data={pendientes.slice(0, 5)} rowKey={(h) => h.nro} vacio="No hay trámites esperando dictamen" columns={[
            { key: 'nro', header: 'N.º HR', principal: true, render: (h) => <span className="font-medium">{h.nro}</span> },
            { key: 'titular', header: 'Titular' },
            { key: 'semaforo', header: 'File', render: (h) => <Semaforo color={h.semaforo} size="sm" /> },
            { key: 'dias', header: 'Esperando', render: (h) => diasTexto(diasDesde(h.desde)) },
            { key: 'accion', header: '', render: (h) => <Button size="sm" icon={Gavel} onClick={() => nav(`/dictamenes/${h.nro}`)}>Dictaminar</Button> },
          ]} />
        </Card>
        <Card title="Trámites por estado" className="xl:col-span-2">
          <div className="h-64">
            <Bar
              data={{ labels: porEstado.map((e) => ESTADOS[e.estado].etiqueta), datasets: [{ label: 'Trámites', data: porEstado.map((e) => e.total), backgroundColor: AZUL, borderRadius: 4 }] }}
              options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } }}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
