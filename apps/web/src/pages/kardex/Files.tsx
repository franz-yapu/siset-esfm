import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Lock, UserPlus } from 'lucide-react';
import type { ColorSemaforo } from '@/types';
import type { CondicionFile, FiltrosFiles } from '@/types/files';
import { usePermiso } from '@/hooks';
import { useEspecialidades, useFiles } from '@/hooks/useFiles';
import { textoSemaforo } from '@/lib/semaforo';
import { Alerta, Button, DataTable, Input, PageHeader, Paginacion, Select, Semaforo } from '@/components/ui';

const POR_PAGINA = 20;
const ESPERA_BUSQUEDA = 300;

/** Filtros y página en la URL: volver atrás desde un file no los pierde (SDD S2.9-S2.10 §2.3). */
const filtrosDeUrl = (p: URLSearchParams): FiltrosFiles => ({
  texto: p.get('texto') ?? undefined,
  especialidadId: Number(p.get('especialidad')) || undefined,
  anioIngreso: Number(p.get('anio')) || undefined,
  condicion: (p.get('condicion') as CondicionFile | null) ?? undefined,
  bloqueado: p.get('bloqueados') === '1' ? true : undefined,
  semaforo: (p.get('semaforo') as ColorSemaforo | null) ?? undefined,
  pagina: Number(p.get('pagina')) || 1,
  porPagina: POR_PAGINA,
});

const urlDeFiltros = (f: FiltrosFiles): Record<string, string> =>
  Object.fromEntries(
    Object.entries({
      texto: f.texto,
      especialidad: f.especialidadId,
      anio: f.anioIngreso,
      condicion: f.condicion,
      bloqueados: f.bloqueado ? '1' : undefined,
      semaforo: f.semaforo,
      pagina: f.pagina && f.pagina > 1 ? f.pagina : undefined,
    })
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );

/** P-40 · Files académicos, contra GET /files (S2.9). KARDEX crea y edita; el resto del personal solo ve. */
export function Files() {
  const editable = usePermiso('editar-file');
  const puedeCrear = usePermiso('nuevo-file');
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtros = filtrosDeUrl(params);
  const ir = (cambios: Partial<FiltrosFiles>) => setParams(urlDeFiltros({ ...filtros, pagina: 1, ...cambios }));

  // El texto se escribe en local y se manda a la URL después de una pausa.
  const [texto, setTexto] = useState(filtros.texto ?? '');
  useEffect(() => {
    const t = setTimeout(() => {
      if (texto.trim() !== (filtros.texto ?? '')) ir({ texto: texto.trim() || undefined });
    }, ESPERA_BUSQUEDA);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia lo escrito
  }, [texto]);

  const { data: especialidades = [] } = useEspecialidades();
  const { data, isLoading, isFetching, error } = useFiles(filtros);
  const total = data?.total ?? 0;
  const anioActual = new Date().getFullYear();

  return (
    <>
      <PageHeader
        titulo="Files académicos"
        subtitulo={editable ? `${total} files` : `${total} files · solo lectura`}
        acciones={
          puedeCrear && (
            <Button icon={UserPlus} onClick={() => nav('/files/nuevo')}>
              Nuevo file
            </Button>
          )
        }
      />
      <div className="mb-4 grid items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          label="Buscar"
          placeholder="CI, nombre o código"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Select
          label="Especialidad"
          value={filtros.especialidadId ?? 0}
          onChange={(e) => ir({ especialidadId: Number(e.target.value) || undefined })}
        >
          <option value={0}>Todas</option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Año de ingreso"
          value={filtros.anioIngreso ?? 0}
          onChange={(e) => ir({ anioIngreso: Number(e.target.value) || undefined })}
        >
          <option value={0}>Todos</option>
          {Array.from({ length: 8 }, (_, i) => anioActual + 1 - i).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select
          label="Condición"
          value={filtros.condicion ?? ''}
          onChange={(e) => ir({ condicion: (e.target.value || undefined) as CondicionFile | undefined })}
        >
          <option value="">Todas</option>
          <option value="ESTUDIANTE">Estudiante</option>
          <option value="EGRESADO">Egresado</option>
        </Select>
        <Select
          label="Semáforo"
          value={filtros.semaforo ?? ''}
          onChange={(e) => ir({ semaforo: (e.target.value || undefined) as ColorSemaforo | undefined })}
        >
          <option value="">Todos</option>
          <option value="VERDE">Verde</option>
          <option value="AMARILLO">Amarillo</option>
          <option value="ROJO">Rojo</option>
        </Select>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="size-4 accent-primario"
            checked={Boolean(filtros.bloqueado)}
            onChange={(e) => ir({ bloqueado: e.target.checked || undefined })}
          />
          Solo bloqueados
        </label>
      </div>
      {error && (
        <Alerta tipo="error" className="mb-4">
          {error.message}
        </Alerta>
      )}
      <DataTable
        data={data?.datos ?? []}
        loading={isLoading}
        rowKey={(x) => x.id}
        vacio="No hay files con esos filtros"
        onRowClick={(x) => nav(`/files/${x.id}`)}
        columns={[
          { key: 'ci', header: 'CI', render: (x) => (x.complemento ? `${x.ci}-${x.complemento}` : x.ci) },
          {
            key: 'nombre',
            header: 'Nombre completo',
            principal: true,
            render: (x) => <span className="font-medium">{x.nombre}</span>,
          },
          { key: 'codigo', header: 'Código', ocultarEnMovil: true },
          { key: 'especialidad', header: 'Especialidad' },
          {
            key: 'anio',
            header: 'Ingreso',
            render: (x) => (x.condicion === 'EGRESADO' ? `${x.anioIngreso} · Egresado` : x.anioIngreso),
          },
          // Calculado por la API (S2.5); provisional hasta D-31.
          {
            key: 'sem',
            header: 'Semáforo',
            render: (x) => <Semaforo color={x.semaforo} texto={textoSemaforo(x.semaforo, x.bloqueado)} size="sm" />,
          },
          {
            key: 'bloq',
            header: 'Bloqueado',
            render: (x) =>
              x.bloqueado ? (
                <Lock className="size-4 text-red-600" aria-label="Bloqueado" />
              ) : (
                <span className="text-slate-300">—</span>
              ),
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
