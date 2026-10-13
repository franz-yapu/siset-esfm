import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, CheckCircle2, FilePlus2, Inbox, Send } from 'lucide-react';
import { useAsync, useUsuario } from '@/hooks';
import { reportesService } from '@/services/reportes.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { fecha } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoBadge, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

/** P-12 · Inicio Secretaría de Dirección (La Paz). */
export function InicioSecDir() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data, loading } = useAsync(
    () => Promise.all([reportesService.resumenInicio(), hojasRutaService.listar()]),
    [],
  );
  if (loading || !data) return <Cargando />;
  const [r, hojas] = data;
  const ultimos = [...hojas].sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso)).slice(0, 5);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Saludo nombre={u.nombre}>Secretaría de Dirección General · Sede Central La Paz</Saludo>
        <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
          Nueva hoja de ruta
        </Button>
      </div>
      {r.enTransitoLp > 0 && (
        <Alerta
          tipo="aviso"
          className="mb-4"
          accion={
            <Link to="/pases" className="font-medium underline">
              Ir a la bandeja
            </Link>
          }
        >
          Tienes {r.enTransitoLp} {r.enTransitoLp === 1 ? 'retorno' : 'retornos'} por recibir desde Ancocagua.
        </Alerta>
      )}
      <GrillaKpi>
        <KpiCard titulo="Ingresados hoy" valor={r.ingresadosHoy} icono={Inbox} to="/hojas-ruta" />
        <KpiCard titulo="En tránsito a Ancocagua" valor={r.enTransitoAnc} icono={Send} color="violeta" to="/pases" />
        <KpiCard
          titulo="Retornos por recibir"
          valor={r.enTransitoLp}
          icono={ArrowLeftRight}
          color="ambar"
          to="/pases"
        />
        <KpiCard titulo="Listos para entrega" valor={r.listos} icono={CheckCircle2} color="verde" to="/entregas" />
      </GrillaKpi>
      <Card
        title="Últimos trámites ingresados"
        actions={
          <Link to="/hojas-ruta" className="text-sm text-acento hover:underline">
            Ver todos
          </Link>
        }
      >
        <DataTable
          data={ultimos}
          rowKey={(h) => h.nro}
          onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
          columns={[
            {
              key: 'nro',
              header: 'N.º HR',
              principal: true,
              render: (h) => <span className="font-medium">{h.nro}</span>,
            },
            { key: 'titular', header: 'Titular' },
            { key: 'tipo', header: 'Tipo' },
            { key: 'fecha', header: 'Ingreso', render: (h) => fecha(h.fechaIngreso) },
            { key: 'estado', header: 'Estado', render: (h) => <EstadoBadge estado={h.estado} /> },
          ]}
        />
      </Card>
    </>
  );
}
