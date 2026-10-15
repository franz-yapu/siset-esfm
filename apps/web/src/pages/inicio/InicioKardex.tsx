import { Link, useNavigate } from 'react-router';
import {
  BellRing,
  FolderOpen,
  Lock,
  Printer,
  Route,
  ScrollText,
  Truck,
  Search,
  TriangleAlert,
  UserCog,
} from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useResumenFiles } from '@/hooks/useFiles';
import { useResumenKardexHojas } from '@/hooks/useHojasRuta';
import { Badge, Card, Cargando, DataTable, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

interface Atencion {
  id: string;
  tipo: 'File bloqueado' | 'Requisito observado';
  quien: string;
  detalle: string;
  to: string;
}

/** Solo lo conectado a la API (S1.12 §2.1, DEC-028, DEC-037). */
const ACCESOS = [
  { to: '/files', texto: 'Buscar file', icono: Search },
  { to: '/hojas-ruta', texto: 'Hojas de ruta', icono: Route },
  { to: '/usuarios', texto: 'Usuarios', icono: UserCog },
  { to: '/bitacora', texto: 'Bitácora', icono: ScrollText },
];

/**
 * P-15 · Inicio Kardex (S1.12). Los files salen de filesService (API o mock): total, bloqueados, en rojo y la
 * lista de rojos. Los trámites salen de hojasRutaService: por recoger, en impresión y por remitir (DEC-037).
 */
export function InicioKardex() {
  const u = useUsuario();
  const nav = useNavigate();
  const files = useResumenFiles();
  const hojas = useResumenKardexHojas();
  if (files.isLoading || !files.data) return <Cargando />;

  const atencion: Atencion[] = [
    ...files.data.atencion.map((f) => ({
      id: `f${f.id}`,
      tipo: f.bloqueado ? ('File bloqueado' as const) : ('Requisito observado' as const),
      quien: f.nombre,
      detalle: f.bloqueado ? (f.motivoBloqueo ?? '') : 'Una defensa o requisito quedó observado',
      to: `/files/${f.id}`,
    })),
  ];

  return (
    <>
      <Saludo nombre={u.nombre}>Responsable de Archivo Kardex · UA Ancocagua</Saludo>
      <GrillaKpi>
        <KpiCard titulo="Files" valor={files.data.total} icono={FolderOpen} to="/files" />
        <KpiCard
          titulo="Files bloqueados"
          valor={files.data.bloqueados}
          icono={Lock}
          color="rojo"
          to="/files?bloqueados=1"
        />
        <KpiCard
          titulo="Files en rojo"
          valor={files.data.rojos}
          icono={TriangleAlert}
          color="rojo"
          to="/files?semaforo=ROJO"
        />
        {hojas.data && (
          <>
            <KpiCard
              titulo="Trámites por recoger"
              valor={hojas.data.porRecoger}
              icono={BellRing}
              to="/hojas-ruta?estado=AVISADO_KARDEX"
            />
            <KpiCard
              titulo="En impresión"
              valor={hojas.data.enImpresion}
              icono={Printer}
              color="violeta"
              to="/hojas-ruta?estado=EN_IMPRESION"
            />
            <KpiCard
              titulo="Por remitir a Calahumana"
              valor={hojas.data.porRemitir}
              icono={Truck}
              color="ambar"
              to="/hojas-ruta?estado=FIRMADO_COORDINADOR"
            />
          </>
        )}
      </GrillaKpi>
      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {ACCESOS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-acento hover:text-acento"
          >
            <a.icono className="size-4 shrink-0" />
            {a.texto}
          </Link>
        ))}
      </div>
      <Card title="Requieren atención">
        <DataTable
          data={atencion}
          rowKey={(a) => a.id}
          onRowClick={(a) => nav(a.to)}
          vacio="Nada pendiente"
          columns={[
            {
              key: 'tipo',
              header: 'Tipo',
              render: (a) => <Badge className="bg-red-50 text-red-700 ring-red-300">{a.tipo}</Badge>,
            },
            {
              key: 'quien',
              header: 'Titular',
              principal: true,
              render: (a) => <span className="font-medium">{a.quien}</span>,
            },
            { key: 'detalle', header: 'Detalle', className: 'text-slate-500' },
          ]}
        />
      </Card>
    </>
  );
}
