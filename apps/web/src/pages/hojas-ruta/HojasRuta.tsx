import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { FilePlus2 } from 'lucide-react';
import { ESTADOS_HOJA_RUTA, type EstadoHojaRuta, type FiltrosHojasRuta } from '@/types/hojas-ruta';
import { usePermiso } from '@/hooks';
import { useHojasRuta, useTiposTramite } from '@/hooks/useHojasRuta';
import { ESTADOS_HR, sedeHr } from '@/config/estados-hoja-ruta';
import { diasDesde, diasTexto, fecha } from '@/lib/formato';
import { Alerta, Button, DataTable, EstadoHojaRutaBadge, Input, PageHeader, Paginacion, Select } from '@/components/ui';

const POR_PAGINA = 20;
const ESPERA_BUSQUEDA = 300;

/** Filtros y página en la URL: volver atrás desde un trámite no los pierde (SDD S3.8-S3.9 §2.4). */
const filtrosDeUrl = (p: URLSearchParams): FiltrosHojasRuta => ({
  texto: p.get('texto') ?? undefined,
  estado: (p.get('estado') as EstadoHojaRuta | null) ?? undefined,
  tipoTramite: p.get('tipo') ?? undefined,
  gestion: Number(p.get('gestion')) || undefined,
  pagina: Number(p.get('pagina')) || 1,
  porPagina: POR_PAGINA,
});

const urlDeFiltros = (f: FiltrosHojasRuta): Record<string, string> =>
  Object.fromEntries(
    Object.entries({
      texto: f.texto,
      estado: f.estado,
      tipo: f.tipoTramite,
      gestion: f.gestion,
      pagina: f.pagina && f.pagina > 1 ? f.pagina : undefined,
    })
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );

/** P-31 · Hojas de ruta, contra GET /hojas-ruta (S3.9). */
export function HojasRuta() {
  const nav = useNavigate();
  const puedeCrear = usePermiso('nueva-hr');
  const [params, setParams] = useSearchParams();
  const filtros = filtrosDeUrl(params);
  const ir = (cambios: Partial<FiltrosHojasRuta>) => setParams(urlDeFiltros({ ...filtros, pagina: 1, ...cambios }));

  const [texto, setTexto] = useState(filtros.texto ?? '');
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto.trim() !== (filtros.texto ?? '')) ir({ texto: texto.trim() || undefined });
    }, ESPERA_BUSQUEDA);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia lo escrito
  }, [texto]);

  const { data: tipos = [] } = useTiposTramite();
  const { data, isLoading, isFetching, error } = useHojasRuta(filtros);
  const total = data?.total ?? 0;
  const anioActual = new Date().getFullYear();

  return (
    <>
      <PageHeader
        titulo="Hojas de ruta"
        subtitulo={`${total} trámites`}
        acciones={
          puedeCrear && (
            <Button icon={FilePlus2} onClick={() => nav('/hojas-ruta/nueva')}>
              Nueva hoja de ruta
            </Button>
          )
        }
      />
      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Buscar" placeholder="N.º, nombre o CI" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Select
          label="Estado"
          value={filtros.estado ?? ''}
          onChange={(e) => ir({ estado: (e.target.value || undefined) as EstadoHojaRuta | undefined })}
        >
          <option value="">Todos</option>
          {ESTADOS_HOJA_RUTA.map((e) => (
            <option key={e} value={e}>
              {ESTADOS_HR[e].etiqueta}
            </option>
          ))}
        </Select>
        <Select
          label="Tipo de trámite"
          value={filtros.tipoTramite ?? ''}
          onChange={(e) => ir({ tipoTramite: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {tipos.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Gestión"
          value={filtros.gestion ?? 0}
          onChange={(e) => ir({ gestion: Number(e.target.value) || undefined })}
        >
          <option value={0}>Todas</option>
          {Array.from({ length: 5 }, (_, i) => anioActual - i).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <Alerta tipo="error" className="mb-4">
          {error.message}
        </Alerta>
      )}
      <DataTable
        data={data?.datos ?? []}
        loading={isLoading}
        rowKey={(h) => h.nro}
        vacio="No hay trámites con esos filtros"
        onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
        columns={[
          {
            key: 'nro',
            header: 'N.º HR',
            principal: true,
            render: (h) => <span className="font-medium">{h.nro}</span>,
          },
          { key: 'titular', header: 'Titular', render: (h) => h.titular.nombre },
          { key: 'ci', header: 'CI', render: (h) => h.titular.ci },
          { key: 'tipo', header: 'Tipo', ocultarEnMovil: true, render: (h) => h.tipo.nombre },
          { key: 'estado', header: 'Estado', render: (h) => <EstadoHojaRutaBadge estado={h.estado} /> },
          { key: 'sede', header: 'Sede actual', render: (h) => sedeHr(h.sedeActual) },
          { key: 'ingreso', header: 'Ingreso', render: (h) => fecha(h.fechaIngreso) },
          {
            key: 'dias',
            header: 'Días',
            render: (h) => (h.fechaCierre ? `Entregado ${fecha(h.fechaCierre)}` : diasTexto(diasDesde(h.fechaIngreso))),
          },
        ]}
      />
      {data && total > 0 && (
        <div className="mt-3">
          <Paginacion
            pagina={data.pagina}
            porPagina={data.porPagina}
            total={total}
            cargando={isFetching}
            onCambiar={(pagina) => setParams(urlDeFiltros({ ...filtros, pagina }))}
          />
        </div>
      )}
    </>
  );
}
