import { Link, useNavigate } from 'react-router';
import { FilePlus2 } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useResumenHojasRuta } from '@/hooks/useHojasRuta';
import { fecha } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoHojaRutaBadge } from '@/components/ui';
import { CaminoTramites } from '@/components/hojas/CaminoTramites';
import { pendientes, Saludo } from './comun';

/** P-12 · Inicio Secretaría de Dirección (Calahumana), contra GET /hojas-ruta (modo demo, DEC-037). */
export function InicioSecDir() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data: r, isLoading, error } = useResumenHojasRuta();
  if (isLoading) return <Cargando />;
  if (error || !r) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el inicio'}</Alerta>;

  // El trámite en Calahumana, en orden: se avisa a Kardex, vuelve impreso para firmas, llega remitido y se entrega.
  const camino = [
    {
      etiqueta: 'Por avisar a Kardex',
      texto: 'por avisar a Kardex',
      total: r.porAvisar,
      to: '/hojas-ruta?estado=RECIBIDO',
    },
    { etiqueta: 'Impresos, por firmar', texto: 'por firmar', total: r.impresos, to: '/hojas-ruta?estado=IMPRESO' },
    {
      etiqueta: 'Remitidos desde Ancocagua',
      texto: 'remitidos desde Ancocagua',
      total: r.remitidos,
      to: '/hojas-ruta?estado=REMITIDO_CALAHUMANA',
    },
    {
      etiqueta: 'Listos para entregar',
      texto: 'listos para entregar',
      total: r.listos,
      to: '/hojas-ruta?estado=LISTO',
    },
  ];

  return (
    <>
      <Saludo
        nombre={u.nombre}
        acciones={
          <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
            Nueva hoja de ruta
          </Button>
        }
      >
        {pendientes(camino, 'No tienes trámites pendientes.')}
      </Saludo>
      <CaminoTramites titulo="Trámites en Calahumana" pasos={camino} />
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
              render: (h) => <span className="font-mono text-[13px] font-medium whitespace-nowrap">{h.nro}</span>,
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
