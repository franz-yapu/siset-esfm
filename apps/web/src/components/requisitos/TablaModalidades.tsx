import { useState } from 'react';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { ModalidadAdmin } from '@/types/catalogo-requisitos';
import { useToast, useUsuario } from '@/hooks';
import { useModalidadesAdmin, useMutacionModalidades } from '@/hooks/useModalidades';
import { catalogoModalidadesService } from '@/services/catalogoModalidades.service';
import { validarModalidad } from '@/lib/catalogo-requisitos';
import { ErrorApi } from '@/lib/errores';
import { Alerta, Badge, Button, Cargando, DataTable, Input, Modal, Textarea, type Columna } from '@/components/ui';
import { Confirmar } from '@/components/hojas/Confirmar';

/**
 * Las modalidades de ingreso (DEC-058): Kardex agrega, edita y da de baja. El código no se cambia después: lo guardan
 * los files y los requisitos. `nuevo` cambia cuando se pulsa "Agregar modalidad" en la cabecera.
 */
export function TablaModalidades({ nuevo }: { nuevo: number }) {
  const u = useUsuario();
  const toast = useToast();
  const { data, isLoading, error } = useModalidadesAdmin();
  const [form, setForm] = useState<ModalidadAdmin | 'nuevo' | null>(null);
  const [abierto, setAbierto] = useState(0);
  const [baja, setBaja] = useState<ModalidadAdmin | null>(null);
  if (nuevo !== abierto) {
    setAbierto(nuevo);
    if (nuevo > 0) setForm('nuevo');
  }
  const cambiarActivo = useMutacionModalidades((m: ModalidadAdmin) =>
    m.activo ? catalogoModalidadesService.darDeBaja(m.id, u) : catalogoModalidadesService.reactivar(m.id, u),
  );

  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudo cargar el catálogo'}</Alerta>;

  const confirmarActivo = async (m: ModalidadAdmin) => {
    try {
      await cambiarActivo.mutateAsync(m);
      toast.success(m.activo ? `Modalidad ${m.codigo} dada de baja` : `Modalidad ${m.codigo} reactivada`);
      setBaja(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const columnas: Columna<ModalidadAdmin>[] = [
    { key: 'orden', header: 'N.º', sortValue: (m) => m.orden, className: 'w-12 tabular-nums', ocultarEnMovil: true },
    {
      key: 'codigo',
      header: 'Código',
      sortValue: (m) => m.codigo,
      className: 'w-24',
      render: (m) => <span className="font-semibold text-slate-900">{m.codigo}</span>,
    },
    {
      key: 'nombre',
      header: 'Modalidad',
      principal: true,
      sortValue: (m) => m.nombre,
      render: (m) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{m.nombre}</p>
          {m.descripcion && <p className="text-xs text-slate-500">{m.descripcion}</p>}
          {!m.activo && <Badge className="mt-1 bg-red-50 text-red-700 ring-red-300">De baja</Badge>}
        </div>
      ),
    },
    {
      key: 'requisitos',
      header: 'Requisitos que la nombran',
      sortValue: (m) => m.requisitos,
      className: 'w-32 tabular-nums',
      render: (m) => m.requisitos,
    },
    {
      key: 'acciones',
      header: '',
      className: 'w-24 text-right',
      render: (m) => (
        <div className="flex justify-end gap-1">
          {m.activo && (
            <Button
              size="sm"
              variant="ghost"
              icon={Pencil}
              onClick={() => setForm(m)}
              aria-label={`Editar la modalidad ${m.codigo}`}
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={m.activo ? Trash2 : RotateCcw}
            onClick={() => (m.activo ? setBaja(m) : void confirmarActivo(m))}
            aria-label={m.activo ? `Dar de baja la modalidad ${m.codigo}` : `Reactivar la modalidad ${m.codigo}`}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <p className="mb-3 text-sm text-slate-500">
        Los requisitos marcados para todas las modalidades también se piden a las que se agreguen después.
      </p>
      <DataTable columns={columnas} data={data} rowKey={(m) => m.id} pageSize={30} vacio="No hay modalidades." />
      {form && (
        <ModalModalidad
          modalidad={form === 'nuevo' ? null : form}
          onCerrar={() => setForm(null)}
          onGuardado={(m) => {
            toast.success(form === 'nuevo' ? `Modalidad ${m.codigo} agregada` : `Modalidad ${m.codigo} guardada`);
            setForm(null);
          }}
        />
      )}
      <Confirmar
        abierto={baja !== null}
        titulo="Dar de baja la modalidad"
        textoConfirmar="Dar de baja"
        peligro
        cargando={cambiarActivo.isPending}
        onCerrar={() => setBaja(null)}
        onConfirmar={() => baja && void confirmarActivo(baja)}
      >
        <p>
          La modalidad <strong>{baja?.codigo}</strong> ya no se podrá elegir al registrar un file ni aparecerá como
          columna en los requisitos.
        </p>
        <p className="mt-2">Los files que ya la tienen la conservan, y vuelve si la reactivas.</p>
      </Confirmar>
    </>
  );
}

function ModalModalidad({
  modalidad,
  onCerrar,
  onGuardado,
}: {
  modalidad: ModalidadAdmin | null;
  onCerrar: () => void;
  onGuardado: (m: ModalidadAdmin) => void;
}) {
  const u = useUsuario();
  const [codigo, setCodigo] = useState(modalidad?.codigo ?? '');
  const [nombre, setNombre] = useState(modalidad?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(modalidad?.descripcion ?? '');
  const [orden, setOrden] = useState(modalidad?.orden ?? 1);
  const [intento, setIntento] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const errores = validarModalidad({ codigo, nombre });

  const guardar = useMutacionModalidades(async () => {
    const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null };
    return modalidad
      ? catalogoModalidadesService.editar(modalidad.id, { ...datos, orden }, u)
      : catalogoModalidadesService.crear({ ...datos, codigo: codigo.trim().toUpperCase() }, u);
  });

  const enviar = async () => {
    setIntento(true);
    setErrorApi(null);
    if (errores.nombre || (!modalidad && errores.codigo)) return;
    try {
      onGuardado(await guardar.mutateAsync(undefined));
    } catch (e) {
      setErrorApi(e instanceof ErrorApi || e instanceof Error ? e.message : 'Error');
    }
  };

  return (
    <Modal
      open
      onClose={onCerrar}
      title={modalidad ? `Editar la modalidad ${modalidad.codigo}` : 'Agregar modalidad'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={guardar.isPending} onClick={() => void enviar()} data-autofocus>
            {modalidad ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorApi && <Alerta tipo="error">{errorApi}</Alerta>}
        <Input
          label="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          disabled={Boolean(modalidad)}
          maxLength={10}
          placeholder="Ej.: B4"
          hint={modalidad ? 'El código no se cambia: lo guardan los files.' : 'Letras y números, como en el folder.'}
          error={intento && !modalidad ? (errores.codigo ?? null) : null}
        />
        <Input
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={80}
          placeholder="Ej.: Modalidad B4"
          error={intento ? (errores.nombre ?? null) : null}
        />
        <Textarea
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={255}
          rows={2}
        />
        {modalidad && (
          <Input
            label="Orden"
            type="number"
            min={1}
            max={999}
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value) || 1)}
            hint="En qué lugar aparece en las listas y en las columnas."
          />
        )}
      </div>
    </Modal>
  );
}
