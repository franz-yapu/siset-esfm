import { Link, useNavigate } from 'react-router';
import { BellRing, CheckCircle2, FilePlus2, PenLine, Truck } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useResumenHojasRuta } from '@/hooks/useHojasRuta';
import { fecha } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoHojaRutaBadge, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

/** P-12 · Inicio Secretaría de Dirección (Calahumana), contra GET /hojas-ruta (modo demo, DEC-037). */
export function InicioSecDir() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data: r, isLoading, error } = useResumenHojasRuta();
  if (isLoading) return <Cargando />;
  if (error || !r) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el inicio'}</Alerta>;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Saludo nombre={u.nombre}>Secretaría de Dirección General · ESFM Calahumana</Saludo>
        <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
          Nueva hoja de ruta
        </Button>
      </div>
      {r.porAvisar > 0 && (
        <Alerta
          tipo="aviso"
          className="mb-4"
          accion={
            <Link to="/hojas-ruta?estado=RECIBIDO" className="font-medium underline">
              Ver trámites
            </Link>
          }
        >
          Tienes {r.porAvisar} {r.porAvisar === 1 ? 'trámite recibido' : 'trámites recibidos'} sin avisar a Kardex.
        </Alerta>
      )}
      <GrillaKpi>
        <KpiCard titulo="Por avisar a Kardex" valor={r.porAvisar} icono={BellRing} to="/hojas-ruta?estado=RECIBIDO" />
        <KpiCard
          titulo="Impresos (firmas)"
          valor={r.impresos}
          icono={PenLine}
          color="violeta"
          to="/hojas-ruta?estado=IMPRESO"
        />
        <KpiCard
          titulo="Remitidos desde Ancocagua"
          valor={r.remitidos}
          icono={Truck}
          color="ambar"
          to="/hojas-ruta?estado=REMITIDO_CALAHUMANA"
        />
        <KpiCard
          titulo="Listos para entregar"
          valor={r.listos}
          icono={CheckCircle2}
          color="verde"
          to="/hojas-ruta?estado=LISTO"
        />
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
          data={r.ultimos}
          rowKey={(h) => h.nro}
          onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
          columns={[
            {
              key: 'nro',
              header: 'N.º HR',
              principal: true,
              render: (h) => <span className="font-medium">{h.nro}</span>,
            },
            { key: 'titular', header: 'Titular', render: (h) => h.titular.nombre },
            { key: 'tipo', header: 'Tipo', render: (h) => h.tipo.nombre },
            { key: 'fecha', header: 'Ingreso', render: (h) => fecha(h.fechaIngreso) },
            { key: 'estado', header: 'Estado', render: (h) => <EstadoHojaRutaBadge estado={h.estado} /> },
          ]}
        />
      </Card>
    </>
  );
}
