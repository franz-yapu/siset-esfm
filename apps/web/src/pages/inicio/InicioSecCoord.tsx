import { Link, useNavigate } from 'react-router';
import { PenLine, Printer, Truck } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useConteosHojasRuta } from '@/hooks/useHojasRuta';
import { fecha } from '@/lib/formato';
import { Alerta, Card, Cargando, DataTable, EstadoHojaRutaBadge, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

/** Lo que pasa en Ancocagua (ADR-0005): impresión en Kardex, firma del Coordinador y remisión a Calahumana. */
const EN_ANCOCAGUA = ['EN_IMPRESION', 'IMPRESO', 'FIRMADO_COORDINADOR'] as const;

/**
 * P-13 · Inicio Secretaría de Coordinación (Ancocagua), contra GET /hojas-ruta. En el flujo de DEC-033 no registra
 * pasos: ve el avance de los trámites que están en Ancocagua.
 */
export function InicioSecCoord() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data, isLoading, error } = useConteosHojasRuta(EN_ANCOCAGUA);
  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el inicio'}</Alerta>;
  const [enImpresion, impresos, porRemitir] = data.totales;

  return (
    <>
      <Saludo nombre={u.nombre}>Secretaría de Coordinación · UA Ancocagua</Saludo>
      <GrillaKpi>
        <KpiCard
          titulo="En impresión (Kardex)"
          valor={enImpresion}
          icono={Printer}
          to="/hojas-ruta?estado=EN_IMPRESION"
        />
        <KpiCard
          titulo="Impresos, por firmar"
          valor={impresos}
          icono={PenLine}
          color="violeta"
          to="/hojas-ruta?estado=IMPRESO"
        />
        <KpiCard
          titulo="Por remitir a Calahumana"
          valor={porRemitir}
          icono={Truck}
          color="ambar"
          to="/hojas-ruta?estado=FIRMADO_COORDINADOR"
        />
      </GrillaKpi>
      <Card
        title="Últimos trámites"
        actions={
          <Link to="/hojas-ruta" className="text-sm text-acento hover:underline">
            Ver todos
          </Link>
        }
      >
        <DataTable
          data={data.ultimos}
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
            { key: 'tipo', header: 'Tipo', ocultarEnMovil: true, render: (h) => h.tipo.nombre },
            { key: 'fecha', header: 'Ingreso', render: (h) => fecha(h.fechaIngreso) },
            { key: 'estado', header: 'Estado', render: (h) => <EstadoHojaRutaBadge estado={h.estado} /> },
          ]}
        />
      </Card>
    </>
  );
}
