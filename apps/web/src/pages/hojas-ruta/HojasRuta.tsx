import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, FilePlus2 } from 'lucide-react';
import type { EstadoTramite } from '@/types';
import { useAsync, usePermiso } from '@/hooks';
import { hojasRutaService, estaDetenido, DIAS_DETENIDO, type FiltrosHojas } from '@/services/hojasRuta.service';
import { ESTADOS, ORDEN_ESTADOS } from '@/config/estados';
import { SEDES, sedeCorta } from '@/config/catalogos';
import { diasDesde, diasTexto, fecha } from '@/lib/formato';
import { Button, DataTable, EstadoBadge, Input, PageHeader, Select } from '@/components/ui';

/** P-31 · Hojas de ruta (lista con filtros). */
export function HojasRuta() {
  const nav = useNavigate();
  const puedeCrear = usePermiso('nueva-hr');
  const [f, setF] = useState<FiltrosHojas>({ texto: '', estado: '', sedeId: '', desde: '', hasta: '' });
  const { data = [], loading } = useAsync(
    () => hojasRutaService.listar(f),
    [f.texto, f.estado, f.sedeId, f.desde, f.hasta],
  );
  const set = (p: Partial<FiltrosHojas>) => setF({ ...f, ...p });

  return (
    <>
      <PageHeader
        titulo="Hojas de ruta"
        subtitulo={`${data.length} trámites · los marcados con ⚠ llevan más de ${DIAS_DETENIDO} días sin movimiento`}
        acciones={
          puedeCrear && (
            <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
              Nueva hoja de ruta
            </Button>
          )
        }
      />
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Buscar"
          placeholder="N.º, nombre o CI"
          value={f.texto}
          onChange={(e) => set({ texto: e.target.value })}
        />
        <Select label="Estado" value={f.estado} onChange={(e) => set({ estado: e.target.value as EstadoTramite | '' })}>
          <option value="">Todos</option>
          {ORDEN_ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADOS[e].etiqueta}
            </option>
          ))}
        </Select>
        <Select
          label="Sede actual"
          value={f.sedeId}
          onChange={(e) => set({ sedeId: e.target.value ? Number(e.target.value) : '' })}
        >
          <option value="">Todas</option>
          {SEDES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Select>
        <Input label="Ingreso desde" type="date" value={f.desde} onChange={(e) => set({ desde: e.target.value })} />
        <Input label="Ingreso hasta" type="date" value={f.hasta} onChange={(e) => set({ hasta: e.target.value })} />
      </div>
      <DataTable
        data={data}
        loading={loading}
        rowKey={(h) => h.nro}
        onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
        resaltar={estaDetenido}
        columns={[
          {
            key: 'nro',
            header: 'N.º HR',
            principal: true,
            sortValue: (h) => h.nro,
            render: (h) => (
              <span className="inline-flex items-center gap-1 font-medium">
                {estaDetenido(h) && <AlertTriangle className="size-4 text-amber-500" aria-label="Detenido" />}
                {h.nro}
              </span>
            ),
          },
          { key: 'titular', header: 'Titular', sortValue: (h) => h.titular },
          { key: 'ci', header: 'CI' },
          { key: 'tipo', header: 'Tipo', ocultarEnMovil: true },
          {
            key: 'estado',
            header: 'Estado',
            sortValue: (h) => ORDEN_ESTADOS.indexOf(h.estado),
            render: (h) => <EstadoBadge estado={h.estado} />,
          },
          { key: 'sede', header: 'Sede actual', render: (h) => sedeCorta(h.sedeActualId) },
          { key: 'ingreso', header: 'Ingreso', sortValue: (h) => h.fechaIngreso, render: (h) => fecha(h.fechaIngreso) },
          {
            key: 'dias',
            header: 'Días',
            sortValue: (h) => diasDesde(h.fechaIngreso),
            render: (h) => diasTexto(diasDesde(h.fechaIngreso)),
          },
          {
            key: 'ver',
            header: '',
            ocultarEnMovil: true,
            render: (h) => (
              <Button size="sm" variant="ghost" onClick={() => nav(`/hojas-ruta/${h.nro}`)}>
                Ver
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}
