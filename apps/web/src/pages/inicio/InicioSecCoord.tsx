import { Link, useNavigate } from 'react-router';
import { FilePlus2 } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useConteosHojasRuta } from '@/hooks/useHojasRuta';
import { fecha } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoHojaRutaBadge } from '@/components/ui';
import { CaminoTramites } from '@/components/hojas/CaminoTramites';
import { pendientes, Saludo } from './comun';

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

  // El certificado recibido en Ancocagua, en orden: se deriva a Kardex, se imprime y vuelve firmado para entregarlo.
  const camino = [
    { etiqueta: 'Por derivar a Kardex', texto: 'por derivar a Kardex', total: porDerivar, to: '/entregas' },
    {
      etiqueta: 'En impresión (Kardex)',
      texto: 'en impresión',
      total: enImpresion,
      to: '/hojas-ruta?estado=EN_IMPRESION',
    },
    { etiqueta: 'Firmados, por entregar', texto: 'por entregar', total: porEntregar, to: '/entregas' },
  ];

  return (
    <>
      <Saludo
        nombre={u.nombre}
        acciones={
          <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
            Recibir un certificado
          </Button>
        }
      >
        {pendientes(camino, 'No tienes certificados pendientes.', ['certificado', 'certificados'])}
      </Saludo>
      <CaminoTramites titulo="Certificados en Ancocagua" pasos={camino} />
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
              render: (h) => <span className="font-mono text-[13px] font-medium whitespace-nowrap">{h.nro}</span>,
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
