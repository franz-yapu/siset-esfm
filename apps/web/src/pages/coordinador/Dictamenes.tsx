import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { useAsync } from '@/hooks';
import { dictamenesService } from '@/services/dictamenes.service';
import { diasDesde, diasTexto, fechaHora } from '@/lib/formato';
import { Badge, Button, Card, Cargando, DataTable, PageHeader, Semaforo, Tabs } from '@/components/ui';

/** P-50 · Dictámenes (COORDINADOR). */
export function Dictamenes() {
  const nav = useNavigate();
  const [tab, setTab] = useState('pendientes');
  const { data, loading } = useAsync(() => Promise.all([dictamenesService.pendientes(), dictamenesService.emitidos()]), []);
  if (loading || !data) return <Cargando />;
  const [pendientes, emitidos] = data;

  return (
    <>
      <PageHeader titulo="Dictámenes" subtitulo="Trámites que Kardex revisó y envió para tu dictamen." />
      <Card>
        <Tabs activa={tab} onChange={setTab} className="mb-4" tabs={[
          { id: 'pendientes', label: 'Pendientes', count: pendientes.length },
          { id: 'emitidos', label: 'Emitidos', count: emitidos.length },
        ]} />
        {tab === 'pendientes' ? (
          <DataTable data={pendientes} rowKey={(h) => h.nro} vacio="No hay trámites pendientes de dictamen" onRowClick={(h) => nav(`/dictamenes/${h.nro}`)} columns={[
            { key: 'nro', header: 'N.º HR', principal: true, render: (h) => <span className="font-medium">{h.nro}</span> },
            { key: 'titular', header: 'Titular' },
            { key: 'esp', header: 'Especialidad', render: (h) => h.especialidad },
            { key: 'tipo', header: 'Tipo' },
            { key: 'file', header: 'File', render: (h) => <Semaforo color={h.semaforo} size="sm" /> },
            { key: 'dias', header: 'Esperando', sortValue: (h) => diasDesde(h.desde), render: (h) => diasTexto(diasDesde(h.desde)) },
            { key: 'accion', header: '', render: (h) => <Button size="sm" icon={Gavel} onClick={() => nav(`/dictamenes/${h.nro}`)}>Dictaminar</Button> },
          ]} />
        ) : (
          <DataTable data={emitidos} rowKey={(d) => `${d.nro}-${d.fecha}`} searchable vacio="Aún no emitiste dictámenes" columns={[
            { key: 'nro', header: 'N.º HR', principal: true, render: (d) => <span className="font-medium">{d.nro}</span> },
            { key: 'titular', header: 'Titular' },
            { key: 'tipo', header: 'Tipo' },
            { key: 'res', header: 'Resultado', render: (d) => (
              <Badge className={d.resultado === 'APROBADO' ? 'bg-green-50 text-green-700 ring-green-300' : 'bg-amber-50 text-amber-700 ring-amber-300'}>
                {d.resultado === 'APROBADO' ? 'Aprobado' : 'Observado'}
              </Badge>
            ) },
            { key: 'obs', header: 'Observaciones', render: (d) => <span className="text-slate-500">{d.obs ?? '—'}</span> },
            { key: 'fecha', header: 'Fecha', render: (d) => fechaHora(d.fecha) },
          ]} />
        )}
      </Card>
    </>
  );
}
