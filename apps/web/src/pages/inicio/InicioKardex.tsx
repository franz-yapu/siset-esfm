import { Link, useNavigate } from 'react-router';
import { ArrowLeftRight, ClipboardCheck, Lock, Printer, Search, UserCog } from 'lucide-react';
import { useAsync, useUsuario } from '@/hooks';
import { reportesService } from '@/services/reportes.service';
import { filesService } from '@/services/files.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { pasesService } from '@/services/pases.service';
import { diasDesde, diasTexto } from '@/lib/formato';
import { nombreCompleto } from '@/lib/reglas';
import { Badge, Card, Cargando, DataTable, KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

interface Atencion {
  id: string;
  tipo: 'File bloqueado' | 'Trámite observado';
  quien: string;
  detalle: string;
  dias?: number;
  to: string;
}

const ACCESOS = [
  { to: '/files', texto: 'Buscar file', icono: Search },
  { to: '/revision', texto: 'Revisión de trámites', icono: ClipboardCheck },
  { to: '/emision', texto: 'Emisión de documentos', icono: Printer },
  { to: '/usuarios', texto: 'Usuarios', icono: UserCog },
];

/** P-15 · Inicio Kardex. */
export function InicioKardex() {
  const u = useUsuario();
  const nav = useNavigate();
  const { data, loading } = useAsync(
    () =>
      Promise.all([
        reportesService.resumenInicio(),
        filesService.listar({ soloBloqueados: true }),
        hojasRutaService.listar({ estado: 'OBSERVADO' }),
        pasesService.porRecibir(2),
      ]),
    [],
  );
  if (loading || !data) return <Cargando />;
  const [r, bloqueados, observados, pases] = data;

  const atencion: Atencion[] = [
    ...bloqueados.map((f) => ({
      id: `f${f.id}`,
      tipo: 'File bloqueado' as const,
      quien: nombreCompleto(f),
      detalle: f.motivoBloqueo ?? '',
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
        <KpiCard
          titulo="Files bloqueados"
          valor={r.filesBloqueados}
          icono={Lock}
          color="rojo"
          to="/files?bloqueados=1"
        />
        <KpiCard titulo="Trámites en revisión" valor={r.enRevision} icono={ClipboardCheck} to="/revision" />
        <KpiCard titulo="Por imprimir" valor={r.porImprimir} icono={Printer} color="violeta" to="/emision" />
        <KpiCard titulo="Pases por recibir" valor={pases.length} icono={ArrowLeftRight} color="ambar" to="/pases" />
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
              render: (a) => (
                <Badge
                  className={
                    a.tipo === 'File bloqueado'
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
