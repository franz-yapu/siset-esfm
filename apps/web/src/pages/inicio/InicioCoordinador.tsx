import { useNavigate } from 'react-router';
import { Bar } from 'react-chartjs-2';
import { PenLine } from 'lucide-react';
import '@/lib/graficos';
import { SECUNDARIO } from '@/lib/graficos';
import { useUsuario } from '@/hooks';
import { useResumenCoordinador } from '@/hooks/useHojasRuta';
import { ESTADOS_HR } from '@/config/estados-hoja-ruta';
import { diasDesde, diasTexto } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, GrillaKpi, KpiCard } from '@/components/ui';
import { Saludo } from './comun';

/**
 * P-14 · Inicio Coordinador contra GET /hojas-ruta (D-20): los trámites que esperan su firma, los que están en
 * cola y los entregados.
 */
export function InicioCoordinador() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data: r, isLoading, error } = useResumenCoordinador();
  if (isLoading) return <Cargando />;
  if (error || !r) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el inicio'}</Alerta>;

  return (
    <>
      <Saludo nombre={u.nombre}>
        {r.firmar.length === 0
          ? 'No hay certificados esperando tu firma.'
          : `${r.firmar.length} ${r.firmar.length === 1 ? 'certificado espera' : 'certificados esperan'} tu firma.`}
      </Saludo>
      <GrillaKpi columnas={3}>
        <KpiCard alerta titulo="Esperan tu firma" valor={r.firmar.length} to="/firmas" />
        <KpiCard titulo="Trámites en curso" valor={r.enCurso} to="/hojas-ruta" />
        <KpiCard titulo="Entregados" valor={r.entregados} to="/hojas-ruta?estado=ENTREGADO" />
      </GrillaKpi>
      <div className="grid gap-4 xl:grid-cols-5">
        <Card title="Esperan tu firma (más antiguos primero)" className="xl:col-span-3">
          <DataTable
            data={r.firmar.slice(0, 8)}
            rowKey={(h) => h.nro}
            vacio="No hay certificados esperando tu firma"
            onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
            columns={[
              {
                key: 'nro',
                header: 'N.º HR',
                principal: true,
                render: (h) => <span className="font-mono text-[13px] font-medium whitespace-nowrap">{h.nro}</span>,
              },
              { key: 'titular', header: 'Titular', render: (h) => h.titular.nombre },
              { key: 'tipo', header: 'Tipo', ocultarEnMovil: true, render: (h) => h.tipo.nombre },
              { key: 'dias', header: 'Desde el ingreso', render: (h) => diasTexto(diasDesde(h.fechaIngreso)) },
              {
                key: 'accion',
                header: '',
                render: (h) => (
                  <Button size="sm" icon={PenLine} onClick={() => nav(`/hojas-ruta/${h.nro}`)}>
                    Firmar
                  </Button>
                ),
              },
            ]}
          />
        </Card>
        <Card title="Trámites por estado" className="xl:col-span-2">
          <div className="h-64">
            <Bar
              data={{
                labels: r.porEstado.map((e) => ESTADOS_HR[e.estado].etiqueta),
                datasets: [
                  {
                    label: 'Trámites',
                    data: r.porEstado.map((e) => e.total),
                    backgroundColor: SECUNDARIO,
                    borderRadius: 2,
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
    </>
  );
}
