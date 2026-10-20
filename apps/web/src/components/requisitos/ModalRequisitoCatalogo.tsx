import { useState } from 'react';
import type { Genero, Modalidad } from '@/types/files';
import { useModalidades } from '@/hooks/useModalidades';
import type { DatosCrearRequisitoCatalogo, RequisitoAdmin } from '@/types/catalogo-requisitos';
import { useUsuario } from '@/hooks';
import { useMutacionCatalogo } from '@/hooks/useCatalogoRequisitos';
import { catalogoRequisitosService } from '@/services/catalogoRequisitos.service';
import { validarRequisitoCatalogo } from '@/lib/catalogo-requisitos';
import { ErrorApi } from '@/lib/errores';
import { Alerta, Button, Input, Modal, Select, Textarea } from '@/components/ui';

interface Props {
  /** `null`: agregar. */
  requisito: RequisitoAdmin | null;
  onCerrar: () => void;
  onGuardado: (r: RequisitoAdmin) => void;
}

const inicial = (
  r: RequisitoAdmin | null,
  modalidades: readonly Modalidad[],
): DatosCrearRequisitoCatalogo & { orden: number } => ({
  nombre: r?.nombre ?? '',
  descripcion: r?.descripcion ?? '',
  anioFormacion: r?.anioFormacion ?? null,
  obligatorio: r?.obligatorio ?? true,
  // Sin modalidades = todas: en el formulario se ven todas marcadas.
  modalidades: r && r.modalidades.length ? r.modalidades : [...modalidades],
  soloGenero: r?.soloGenero ?? null,
  porGestion: r?.porGestion ?? false,
  soloAniosTerminados: r?.soloAniosTerminados ?? false,
  pideCurso: r?.pideCurso ?? false,
  orden: r?.orden ?? 0,
});

function Casilla({
  etiqueta,
  ayuda,
  checked,
  disabled,
  onChange,
}: {
  etiqueta: string;
  ayuda?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-tinta">
      <input
        type="checkbox"
        className="mt-0.5 size-4 accent-acento"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {etiqueta}
        {ayuda && <span className="block text-xs text-suave">{ayuda}</span>}
      </span>
    </label>
  );
}

/** Agregar o editar un requisito del catálogo (DEC-055). "Por gestión" solo se elige al agregar. */
export function ModalRequisitoCatalogo({ requisito, onCerrar, onGuardado }: Props) {
  const u = useUsuario();
  // Las columnas son las modalidades activas del catálogo (DEC-058); la página ya las cargó.
  const { data: catalogo = [] } = useModalidades();
  const codigos = catalogo.map((m) => m.codigo);
  const [f, setF] = useState(() => inicial(requisito, codigos));
  const [intento, setIntento] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const cambiar = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const guardar = useMutacionCatalogo(async () => {
    const datos = { ...f, nombre: f.nombre.trim(), descripcion: f.descripcion?.trim() || null };
    if (!requisito) {
      const { orden: _orden, ...nuevo } = datos;
      return catalogoRequisitosService.crear(nuevo, u);
    }
    const { porGestion: _g, soloAniosTerminados: _t, ...cambios } = datos;
    return catalogoRequisitosService.editar(requisito.id, cambios, u);
  });

  const errores = validarRequisitoCatalogo(f);
  const sinModalidad = f.modalidades.length === 0;

  const enviar = async () => {
    setIntento(true);
    setErrorApi(null);
    if (errores.nombre || sinModalidad) return;
    try {
      onGuardado(await guardar.mutateAsync(undefined));
    } catch (e) {
      setErrorApi(e instanceof ErrorApi || e instanceof Error ? e.message : 'Error');
    }
  };

  const alternar = (m: Modalidad) =>
    cambiar(
      'modalidades',
      f.modalidades.includes(m)
        ? f.modalidades.filter((x) => x !== m)
        : codigos.filter((x) => x === m || f.modalidades.includes(x)),
    );

  return (
    <Modal
      open
      onClose={onCerrar}
      title={requisito ? 'Editar requisito' : 'Agregar requisito'}
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={guardar.isPending} onClick={() => void enviar()} data-autofocus>
            {requisito ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {errorApi && <Alerta tipo="error">{errorApi}</Alerta>}
        <Input
          label="Nombre"
          value={f.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          error={intento ? (errores.nombre ?? null) : null}
          maxLength={120}
          placeholder="Ej.: Certificado de práctica docente"
        />
        <Textarea
          label="Descripción (opcional)"
          value={f.descripcion ?? ''}
          onChange={(e) => cambiar('descripcion', e.target.value)}
          maxLength={255}
          rows={2}
        />
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-tinta">Se pide a las modalidades</legend>
          <div className="flex flex-wrap gap-4">
            {codigos.map((m) => (
              <Casilla key={m} etiqueta={m} checked={f.modalidades.includes(m)} onChange={() => alternar(m)} />
            ))}
          </div>
          {intento && sinModalidad && <p className="mt-1 text-xs text-red-600">Marca al menos una modalidad.</p>}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Año de formación"
            value={f.anioFormacion ?? ''}
            onChange={(e) => cambiar('anioFormacion', e.target.value ? Number(e.target.value) : null)}
            hint="Si es de un año, se marca atrasado cuando el estudiante lo pasa sin completarlo."
          >
            <option value="">No es de un año</option>
            {[1, 2, 3, 4, 5].map((a) => (
              <option key={a} value={a}>
                {a}.º año
              </option>
            ))}
          </Select>
          <Select
            label="Género"
            value={f.soloGenero ?? ''}
            onChange={(e) => cambiar('soloGenero', (e.target.value || null) as Genero | null)}
          >
            <option value="">A todos</option>
            <option value="MASCULINO">Solo varones</option>
            <option value="FEMENINO">Solo mujeres</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Casilla
            etiqueta="Obligatorio"
            ayuda="Cuenta para el semáforo del file. Si no, se muestra como “si corresponde”."
            checked={f.obligatorio}
            onChange={(v) => cambiar('obligatorio', v)}
          />
          <Casilla
            etiqueta="Pide el nombre del curso y la entidad (como los TACFI)"
            checked={f.pideCurso}
            onChange={(v) => cambiar('pideCurso', v)}
          />
          <Casilla
            etiqueta="Se entrega una vez por gestión (como la matrícula)"
            ayuda={requisito ? 'No se cambia después de agregarlo.' : undefined}
            checked={f.porGestion}
            disabled={Boolean(requisito)}
            onChange={(v) => setF((x) => ({ ...x, porGestion: v, soloAniosTerminados: v && x.soloAniosTerminados }))}
          />
          {f.porGestion && (
            <Casilla
              etiqueta="Solo cuentan los años ya terminados (como el certificado de notas)"
              checked={f.soloAniosTerminados}
              disabled={Boolean(requisito)}
              onChange={(v) => cambiar('soloAniosTerminados', v)}
            />
          )}
        </div>
        {requisito && (
          <Input
            label="N.º en la hoja del folder"
            type="number"
            min={1}
            max={999}
            value={f.orden}
            onChange={(e) => cambiar('orden', Number(e.target.value) || 1)}
            hint="El orden en que se muestra en el file."
          />
        )}
      </div>
    </Modal>
  );
}
