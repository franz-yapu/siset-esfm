import { useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { MODALIDADES, type Modalidad } from '@/types/files';
import type { RequisitoAdmin } from '@/types/catalogo-requisitos';
import { useToast, useUsuario } from '@/hooks';
import { useCatalogoRequisitos, useMutacionCatalogo } from '@/hooks/useCatalogoRequisitos';
import { catalogoRequisitosService } from '@/services/catalogoRequisitos.service';
import { alternarModalidad, aplicaAModalidad } from '@/lib/catalogo-requisitos';
import { Alerta, Badge, Button, Cargando, DataTable, PageHeader, Tabs, type Columna } from '@/components/ui';
import { Confirmar } from '@/components/hojas/Confirmar';
import { ModalRequisitoCatalogo } from '@/components/requisitos/ModalRequisitoCatalogo';

type Filtro = 'TODAS' | Modalidad | 'BAJA';

/**
 * Kardex · Requisitos por modalidad (DEC-055). Cada fila es un requisito del folder personal y cada columna una
 * modalidad de ingreso: marcar o desmarcar cambia a quién se le pide. Agregar y dar de baja también se hacen aquí; la
 * baja no borra lo registrado en los files.
 */
export function RequisitosModalidad() {
  const u = useUsuario();
  const toast = useToast();
  const { data, isLoading, error } = useCatalogoRequisitos();
  const [filtro, setFiltro] = useState<Filtro>('TODAS');
  const [form, setForm] = useState<RequisitoAdmin | 'nuevo' | null>(null);
  const [baja, setBaja] = useState<RequisitoAdmin | null>(null);
  // La casilla cambia al clic, sin esperar a la API; si falla, vuelve a lo que diga el catálogo.
  const [enCurso, setEnCurso] = useState<Record<number, Modalidad[]>>({});

  const editar = useMutacionCatalogo(({ id, modalidades }: { id: number; modalidades: Modalidad[] }) =>
    catalogoRequisitosService.editar(id, { modalidades }, u),
  );
  const cambiarActivo = useMutacionCatalogo((r: RequisitoAdmin) =>
    r.activo ? catalogoRequisitosService.darDeBaja(r.id, u) : catalogoRequisitosService.reactivar(r.id, u),
  );

  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el catálogo'}</Alerta>;

  const catalogo = data.map((r) => (enCurso[r.id] ? { ...r, modalidades: enCurso[r.id]! } : r));
  const activos = catalogo.filter((r) => r.activo);
  const visibles =
    filtro === 'BAJA'
      ? catalogo.filter((r) => !r.activo)
      : filtro === 'TODAS'
        ? activos
        : activos.filter((r) => aplicaAModalidad(r, filtro));

  const alternar = async (r: RequisitoAdmin, m: Modalidad) => {
    const modalidades = alternarModalidad(r.modalidades, m, MODALIDADES);
    if (!modalidades) {
      toast.error('Debe pedirse al menos a una modalidad. Si ya no se pide a nadie, dalo de baja.');
      return;
    }
    setEnCurso((x) => ({ ...x, [r.id]: modalidades }));
    try {
      await editar.mutateAsync({ id: r.id, modalidades });
      toast.success(
        `${r.nombre}: ${modalidades.length === MODALIDADES.length ? 'todas las modalidades' : modalidades.join(', ')}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setEnCurso(({ [r.id]: _hecho, ...resto }) => resto);
    }
  };

  const confirmarActivo = async (r: RequisitoAdmin) => {
    try {
      await cambiarActivo.mutateAsync(r);
      toast.success(r.activo ? `"${r.nombre}" dado de baja` : `"${r.nombre}" vuelve a pedirse`);
      setBaja(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const columnas: Columna<RequisitoAdmin>[] = [
    { key: 'orden', header: 'N.º', sortValue: (r) => r.orden, className: 'w-12 tabular-nums', ocultarEnMovil: true },
    {
      key: 'nombre',
      header: 'Requisito',
      principal: true,
      sortValue: (r) => r.nombre,
      render: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{r.nombre}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {!r.obligatorio && <Badge>Si corresponde</Badge>}
            {r.anioFormacion && <Badge>{r.anioFormacion}.º año</Badge>}
            {r.porGestion && <Badge>Por gestión</Badge>}
            {r.soloGenero === 'MASCULINO' && <Badge>Solo varones</Badge>}
            {r.soloGenero === 'FEMENINO' && <Badge>Solo mujeres</Badge>}
            {!r.activo && <Badge className="bg-red-50 text-red-700 ring-red-300">De baja</Badge>}
          </div>
        </div>
      ),
    },
    ...MODALIDADES.map((m): Columna<RequisitoAdmin> => ({
      key: m,
      header: m,
      className: 'w-14 text-center',
      render: (r) => (
        <label className="inline-flex items-center gap-1.5 sm:justify-center">
          <input
            type="checkbox"
            className="size-4 accent-acento"
            checked={aplicaAModalidad(r, m)}
            disabled={!r.activo || editar.isPending}
            onChange={() => void alternar(r, m)}
            aria-label={`Pedir "${r.nombre}" a la modalidad ${m}`}
          />
          <span className="text-xs text-slate-500 sm:hidden">{m}</span>
        </label>
      ),
    })),
    {
      key: 'acciones',
      header: '',
      className: 'w-24 text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          {r.activo && (
            <Button
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={() => setForm(r)}
              aria-label={`Editar ${r.nombre}`}
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={r.activo ? Trash2 : RotateCcw}
            onClick={() => (r.activo ? setBaja(r) : void confirmarActivo(r))}
            aria-label={r.activo ? `Dar de baja ${r.nombre}` : `Reactivar ${r.nombre}`}
          />
        </div>
      ),
    },
  ];

  const pestañas = [
    { id: 'TODAS', label: 'Todas', count: activos.length },
    ...MODALIDADES.map((m) => ({
      id: m,
      label: `Modalidad ${m}`,
      count: activos.filter((r) => aplicaAModalidad(r, m)).length,
    })),
    { id: 'BAJA', label: 'Dados de baja', count: catalogo.length - activos.length },
  ];

  return (
    <>
      <PageHeader
        titulo="Requisitos por modalidad"
        subtitulo="Qué se le pide a cada estudiante según su modalidad de ingreso. Los cambios cuentan enseguida para el semáforo de los files."
        acciones={
          <Button icon={Plus} onClick={() => setForm('nuevo')}>
            Agregar requisito
          </Button>
        }
      />
      <Tabs tabs={pestañas} activa={filtro} onChange={(id) => setFiltro(id as Filtro)} className="mb-4" />
      <DataTable
        columns={columnas}
        data={visibles}
        rowKey={(r) => r.id}
        searchable
        searchText={(r) => `${r.nombre} ${r.codigo}`}
        pageSize={30}
        vacio={filtro === 'BAJA' ? 'No hay requisitos dados de baja.' : 'No hay requisitos para esta modalidad.'}
      />
      {form && (
        <ModalRequisitoCatalogo
          requisito={form === 'nuevo' ? null : form}
          onCerrar={() => setForm(null)}
          onGuardado={(r) => {
            toast.success(form === 'nuevo' ? `"${r.nombre}" agregado` : `"${r.nombre}" guardado`);
            setForm(null);
          }}
        />
      )}
      <Confirmar
        abierto={baja !== null}
        titulo="Dar de baja el requisito"
        textoConfirmar="Dar de baja"
        peligro
        cargando={cambiarActivo.isPending}
        onCerrar={() => setBaja(null)}
        onConfirmar={() => baja && void confirmarActivo(baja)}
      >
        <p>
          <strong>{baja?.nombre}</strong> dejará de pedirse a todas las modalidades y de contar para el semáforo.
        </p>
        <p className="mt-2">Lo que ya se registró en los files se conserva y vuelve a verse si lo reactivas.</p>
      </Confirmar>
    </>
  );
}
