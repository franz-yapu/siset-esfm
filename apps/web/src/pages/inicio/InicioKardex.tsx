import { Link, useNavigate } from 'react-router';
import {
  ArrowLeftRight,
  ClipboardCheck,
  FolderOpen,
  Lock,
  Printer,
  ScrollText,
  Search,
  TriangleAlert,
  UserCog,
} from 'lucide-react';
import { useAsync, useUsuario } from '@/hooks';
import { reportesService } from '@/services/reportes.service';
import { hojasRutaPrototipoService } from '@/services/hojasRuta-prototipo.service';
import { pasesService } from '@/services/pases.service';
import { diasDesde, diasTexto } from '@/lib/formato';
import { todoMock } from '@/services/_modo';
import { useResumenFiles } from '@/hooks/useFiles';
import { Badge, Card, Cargando, DataTable, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

interface Atencion {
  id: string;
  tipo: 'File bloqueado' | 'Requisito observado' | 'Trámite observado';
  quien: string;
  detalle: string;
  dias?: number;
  to: string;
}

/** Con la API, solo lo conectado (S1.12 §2.1, DEC-028); en la demo, todo. */
const ACCESOS = [
  { to: '/files', texto: 'Buscar file', icono: Search, conectado: true },
  { to: '/revision', texto: 'Revisión de trámites', icono: ClipboardCheck, conectado: false },
  { to: '/emision', texto: 'Emisión de documentos', icono: Printer, conectado: false },
  { to: '/usuarios', texto: 'Usuarios', icono: UserCog, conectado: true },
  { to: '/bitacora', texto: 'Bitácora', icono: ScrollText, conectado: true },
];

/**
 * P-15 · Inicio Kardex (S1.12). Los files salen de filesService (API o mock): total, bloqueados, en rojo y la
 * lista de rojos. Trámites, pases e impresiones solo en la demo hasta S3.x–S5.x (DEC-032).
 */
export function InicioKardex() {
  const u = useUsuario();
  const nav = useNavigate();
  const demo = todoMock();
  const files = useResumenFiles();
  const { data, loading } = useAsync(
    () =>
      demo
        ? Promise.all([
            reportesService.resumenInicio(),
            hojasRutaPrototipoService.listar({ estado: 'OBSERVADO' }),
            pasesService.porRecibir(2),
          ])
        : Promise.resolve(null),
    [demo],
  );
  if (files.isLoading || loading || !files.data) return <Cargando />;
  const [r, observados, pases] = data ?? [null, [], []];

  const atencion: Atencion[] = [
    ...files.data.atencion.map((f) => ({
      id: `f${f.id}`,
      tipo: f.bloqueado ? ('File bloqueado' as const) : ('Requisito observado' as const),
      quien: f.nombre,
      detalle: f.bloqueado ? (f.motivoBloqueo ?? '') : 'Una defensa o requisito quedó observado',
      to: `/files/${f.id}`,
    })),
    ...observados
      .map((h) => ({ h, dias: diasDesde(h.movimientos.at(-1)?.fecha ?? h.fechaIngreso) }))
      .filter(({ dias }) => dias > 5)
      .map(({ h, dias }) => ({
        id: h.nro,
        tipo: 'Trámite observado' as const,
        quien: h.titular,
        detalle: `${h.nro} · ${h.movimientos.at(-1)?.obs ?? ''}`,
        dias,
        to: `/hojas-ruta/${h.nro}`,
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
        {r && (
          <>
            <KpiCard titulo="Trámites en revisión" valor={r.enRevision} icono={ClipboardCheck} to="/revision" />
            <KpiCard titulo="Por imprimir" valor={r.porImprimir} icono={Printer} color="violeta" to="/emision" />
            <KpiCard titulo="Pases por recibir" valor={pases.length} icono={ArrowLeftRight} color="ambar" to="/pases" />
          </>
        )}
      </GrillaKpi>
      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-5">
        {ACCESOS.filter((a) => demo || a.conectado).map((a) => (
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
              render: (a) => (
                <Badge
                  className={
                    a.tipo !== 'Trámite observado'
                      ? 'bg-red-50 text-red-700 ring-red-300'
                      : 'bg-amber-50 text-amber-700 ring-amber-300'
                  }
                >
                  {a.tipo}
                </Badge>
              ),
            },
            {
              key: 'quien',
              header: 'Titular',
              principal: true,
              render: (a) => <span className="font-medium">{a.quien}</span>,
            },
            { key: 'detalle', header: 'Detalle', className: 'text-slate-500' },
            { key: 'dias', header: 'Hace', render: (a) => (a.dias === undefined ? '—' : diasTexto(a.dias)) },
          ]}
        />
      </Card>
    </>
  );
}
