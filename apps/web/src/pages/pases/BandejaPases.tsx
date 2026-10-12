import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { pasesService, type Pase } from '@/services/pases.service';
import { sedeCorta } from '@/config/catalogos';
import { fechaHora } from '@/lib/formato';
import { Button, Card, Cargando, DataTable, EstadoBadge, PageHeader, Tabs } from '@/components/ui';
import { Confirmar } from '@/components/hojas/Confirmar';

/** P-33 · Bandeja de pases: por recibir, enviados e historial de mi sede. */
export function BandejaPases() {
  const u = useUsuario();
  const nav = useNavigate();
  const sede = u.sedeId ?? 2;
  const [tab, setTab] = useState('recibir');
  const [sel, setSel] = useState<Set<string | number>>(new Set());
  const [confirmar, setConfirmar] = useState<string[] | null>(null);
  const { ejecutar, ocupado } = useAccion();
  const { data, loading, reload } = useAsync(
    () => Promise.all([pasesService.porRecibir(sede), pasesService.enviados(sede), pasesService.historial(sede)]), [sede]);
  if (loading && !data) return <Cargando />;
  if (!data) return null;
  const [porRecibir, enviados, historial] = data;

  const recibir = async () => {
    if (!confirmar) return;
    const n = confirmar.length;
    if (await ejecutar(() => pasesService.recibir(confirmar, u), n === 1 ? 'Pase recibido' : `${n} pases recibidos`)) {
      setConfirmar(null); setSel(new Set()); reload();
    }
  };

  const colsPase = (conBoton: boolean) => [
    { key: 'nro', header: 'N.º HR', principal: true, render: (p: Pase) => <span className="font-medium">{p.nro}</span> },
    { key: 'titular', header: 'Titular' },
    { key: 'viene', header: conBoton ? 'Viene de' : 'Destino', render: (p: Pase) => (conBoton ? sedeCorta(p.vieneDe) : sedeCorta(p.vieneDe === 1 ? 2 : 1)) },
    { key: 'por', header: 'Enviado por', render: (p: Pase) => p.enviadoPor },
    { key: 'fecha', header: 'Fecha de envío', render: (p: Pase) => fechaHora(p.fechaEnvio) },
    { key: 'obs', header: 'Observación', ocultarEnMovil: !conBoton, render: (p: Pase) => <span className="text-slate-500">{p.obsEnvio ?? '—'}</span> },
    conBoton
      ? { key: 'accion', header: '', render: (p: Pase) => <Button size="sm" variant="success" onClick={() => setConfirmar([p.nro])}>Recibir</Button> }
      : { key: 'estado', header: 'Estado', render: (p: Pase) => <EstadoBadge estado={p.estado} /> },
  ];

  return (
    <>
      <PageHeader titulo="Bandeja de pases" subtitulo={`Sede: ${sede === 1 ? 'Sede Central La Paz' : 'UA Ancocagua'}`} />
      <Card>
        <Tabs activa={tab} onChange={setTab} className="mb-4" tabs={[
          { id: 'recibir', label: 'Por recibir', count: porRecibir.length },
          { id: 'enviados', label: 'Enviados', count: enviados.length },
          { id: 'historial', label: 'Historial' },
        ]} />
        {tab === 'recibir' && (
          <DataTable data={porRecibir} rowKey={(p) => p.nro} vacio="No hay pases por recibir" seleccion={{ seleccionados: sel, onChange: setSel }}
            onRowClick={(p) => nav(`/hojas-ruta/${p.nro}`)} columns={colsPase(true)}
            toolbar={sel.size > 0 && <Button icon={CheckCheck} variant="success" onClick={() => setConfirmar([...sel].map(String))}>Recibir seleccionados ({sel.size})</Button>} />
        )}
        {tab === 'enviados' && <DataTable data={enviados} rowKey={(p) => p.nro} vacio="No hay envíos pendientes de recepción" onRowClick={(p) => nav(`/hojas-ruta/${p.nro}`)} columns={colsPase(false)} />}
        {tab === 'historial' && (
          <DataTable data={historial} rowKey={(p) => `${p.nro}-${p.envio}`} searchable pageSize={10} onRowClick={(p) => nav(`/hojas-ruta/${p.nro}`)} columns={[
            { key: 'nro', header: 'N.º HR', principal: true, render: (p) => <span className="font-medium">{p.nro}</span> },
            { key: 'titular', header: 'Titular' },
            { key: 'ruta', header: 'Ruta', render: (p) => `${sedeCorta(p.origen)} → ${sedeCorta(p.destino)}` },
            { key: 'envio', header: 'Enviado', render: (p) => `${fechaHora(p.envio)} · ${p.enviadoPor}` },
            { key: 'recepcion', header: 'Recibido', render: (p) => `${fechaHora(p.recepcion)} · ${p.recibidoPor}` },
          ]} />
        )}
      </Card>
      <Confirmar abierto={confirmar !== null} titulo="Confirmar recepción" cargando={ocupado} onCerrar={() => setConfirmar(null)} onConfirmar={recibir} textoConfirmar="Recibir">
        ¿Confirmas que recibiste físicamente {confirmar?.length === 1 ? `el expediente ${confirmar[0]}` : `${confirmar?.length} expedientes`}?
      </Confirmar>
    </>
  );
}
