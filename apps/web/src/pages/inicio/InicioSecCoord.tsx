import { Link, useNavigate } from 'react-router';
import { BellRing, FilePlus2, PackageCheck, Printer } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useConteosHojasRuta } from '@/hooks/useHojasRuta';
import { fecha } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoHojaRutaBadge, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

/**
 * Lo que pasa en Ancocagua: los certificados que recibe Secretaría de Coordinación (D-32b, ADR-0011) por derivar y por
 * entregar, y lo que está en impresión en Kardex.
 */
const EN_ANCOCAGUA = [
  { estado: 'RECIBIDO', sedeIngreso: 'ANCOCAGUA' },
  { estado: 'FIRMADO_COORDINADOR', sedeIngreso: 'ANCOCAGUA' },
  { estado: 'EN_IMPRESION' },
] as const;

/**
 * P-13 · Inicio Secretaría de Coordinación (Ancocagua), contra GET /hojas-ruta. Desde D-32b recibe los certificados
 * en Ancocagua: los deriva a Kardex y los entrega cuando el Coordinador los firmó (ADR-0011).
 */
export function InicioSecCoord() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data, isLoading, error } = useConteosHojasRuta(EN_ANCOCAGUA);
  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el inicio'}</Alerta>;
  const [porDerivar, porEntregar, enImpresion] = data.totales;

  return (
    <>
      <Saludo nombre={u.nombre}>Secretaría de Coordinación · UA Ancocagua</Saludo>
      <div className="mb-4">
        <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
          Recibir un certificado
        </Button>
      </div>
      <GrillaKpi>
        <KpiCard titulo="Por derivar a Kardex" valor={porDerivar} icono={BellRing} color="ambar" to="/entregas" />
        <KpiCard
          titulo="Firmados, por entregar"
          valor={porEntregar}
          icono={PackageCheck}
          color="violeta"
          to="/entregas"
        />
        <KpiCard
          titulo="En impresión (Kardex)"
          valor={enImpresion}
          icono={Printer}
          to="/hojas-ruta?estado=EN_IMPRESION"
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
