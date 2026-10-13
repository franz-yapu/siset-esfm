import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, UserPlus } from 'lucide-react';
import type { ColorSemaforo } from '@/types';
import { useAsync, useUsuario } from '@/hooks';
import { filesService, type FiltrosFiles } from '@/services/files.service';
import { ESPECIALIDADES } from '@/config/catalogos';
import { puedeEditarFiles } from '@/config/permisos';
import { nombreCompleto, semaforoFile } from '@/lib/reglas';
import { ordinal } from '@/lib/formato';
import { Button, DataTable, Input, PageHeader, Select, Semaforo } from '@/components/ui';

/** P-40 · Files académicos (KARDEX edita; el resto del personal solo ve). */
export function Files() {
  const u = useUsuario();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState<FiltrosFiles>({
    texto: '',
    especialidad: '',
    anio: 0,
    semaforo: '',
    soloBloqueados: params.get('bloqueados') === '1',
  });
  const { data = [], loading } = useAsync(
    () => filesService.listar(f),
    [f.texto, f.especialidad, f.anio, f.semaforo, f.soloBloqueados],
  );
  const set = (p: Partial<FiltrosFiles>) => setF({ ...f, ...p });

  return (
    <>
      <PageHeader
        titulo="Files académicos"
        subtitulo={puedeEditarFiles(u.rol) ? `${data.length} files` : `${data.length} files · solo lectura`}
        acciones={
          puedeEditarFiles(u.rol) && (
            <Button icon={UserPlus} onClick={() => nav('/files/nuevo')}>
              Nuevo file
            </Button>
          )
        }
      />
      <div className="mb-4 grid items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label="Buscar"
          placeholder="CI, nombre o código"
          value={f.texto}
          onChange={(e) => set({ texto: e.target.value })}
        />
        <Select label="Especialidad" value={f.especialidad} onChange={(e) => set({ especialidad: e.target.value })}>
          <option value="">Todas</option>
          {ESPECIALIDADES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </Select>
        <Select label="Año de formación" value={f.anio} onChange={(e) => set({ anio: Number(e.target.value) })}>
          <option value={0}>Todos</option>
          {[1, 2, 3, 4, 5].map((a) => (
            <option key={a} value={a}>
              {ordinal(a)} año
            </option>
          ))}
        </Select>
        <Select
          label="Semáforo"
          value={f.semaforo}
          onChange={(e) => set({ semaforo: e.target.value as ColorSemaforo | '' })}
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
            checked={f.soloBloqueados}
            onChange={(e) => set({ soloBloqueados: e.target.checked })}
          />
          Solo bloqueados
        </label>
      </div>
      <DataTable
        data={data}
        loading={loading}
        rowKey={(x) => x.id}
        onRowClick={(x) => nav(`/files/${x.id}`)}
        columns={[
          { key: 'ci', header: 'CI', sortValue: (x) => x.ci },
          {
            key: 'nombre',
            header: 'Nombre completo',
            principal: true,
            sortValue: (x) => x.apellidos,
            render: (x) => <span className="font-medium">{nombreCompleto(x)}</span>,
          },
          { key: 'codigo', header: 'Código', ocultarEnMovil: true },
          { key: 'esp', header: 'Especialidad', sortValue: (x) => x.especialidad, render: (x) => x.especialidad },
          {
            key: 'anio',
            header: 'Año',
            sortValue: (x) => x.matriculas.at(-1)?.anio ?? 0,
            render: (x) => (x.condicion === 'EGRESADO' ? 'Egresado' : `${ordinal(x.matriculas.at(-1)?.anio ?? 1)}`),
          },
          {
            key: 'sem',
            header: 'Semáforo',
            sortValue: (x) => ['VERDE', 'AMARILLO', 'ROJO'].indexOf(semaforoFile(x)),
            render: (x) => <Semaforo color={semaforoFile(x)} size="sm" />,
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
          {
            key: 'ver',
            header: '',
            ocultarEnMovil: true,
            render: (x) => (
              <Button size="sm" variant="ghost" onClick={() => nav(`/files/${x.id}`)}>
                Ver
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}
