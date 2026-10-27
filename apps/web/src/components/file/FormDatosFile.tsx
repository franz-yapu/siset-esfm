import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import {
  type CondicionFile,
  type DatosCrearFile,
  type Especialidad,
  type FileDetalle,
  type Genero,
  type Modalidad,
} from '@/types/files';
import { erroresDelFormularioFile, normalizarDatosFile, validarDatosFile, type CampoFile } from '@/lib/files';
import { useModalidades } from '@/hooks/useModalidades';
import { Alerta, Button, Input, Select } from '@/components/ui';

const vacio = (): DatosCrearFile => ({
  ci: '',
  complemento: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  fechaNacimiento: '',
  celular: '',
  email: '',
  direccion: '',
  codigo: '',
  especialidadId: 0,
  anioIngreso: new Date().getFullYear(),
  condicion: 'ESTUDIANTE',
  genero: null,
  modalidad: null,
  anioFormacion: null,
});

/** Los datos de un file existente, en la forma del formulario. */
export const datosDeFile = (f: FileDetalle): DatosCrearFile => ({
  ci: f.ci,
  complemento: f.complemento,
  nombres: f.nombres,
  apellidoPaterno: f.apellidoPaterno ?? '',
  apellidoMaterno: f.apellidoMaterno ?? '',
  fechaNacimiento: f.fechaNacimiento ?? '',
  celular: f.celular ?? '',
  email: f.email ?? '',
  direccion: f.direccion ?? '',
  codigo: f.codigo,
  especialidadId: f.especialidadId,
  anioIngreso: f.anioIngreso,
  condicion: f.condicion,
  genero: f.genero,
  modalidad: f.modalidad,
  anioFormacion: f.anioFormacion,
});

interface Props {
  inicial?: FileDetalle;
  especialidades: Especialidad[];
  soloLectura?: boolean;
  /** Recibe los datos ya normalizados. Si lanza un error de la API, se muestra en su campo. */
  onGuardar: (d: DatosCrearFile) => Promise<void>;
}

/**
 * Formulario del file (P-42 y pestaña "Datos personales" de P-41), con el contrato de la API (SDD
 * S2.9-S2.10 §2.5). Al editar, el CI y el complemento no se cambian (DEC-027 #1).
 */
export function FormDatosFile({ inicial, especialidades, soloLectura, onGuardar }: Props) {
  const editando = Boolean(inicial);
  const [d, setD] = useState<DatosCrearFile>(() => (inicial ? datosDeFile(inicial) : vacio()));
  // Las activas del catálogo (DEC-058); si el file tiene una dada de baja, se sigue mostrando para no perderla.
  const { data: activas = [] } = useModalidades();
  const opcionesModalidad =
    d.modalidad && !activas.some((m) => m.codigo === d.modalidad)
      ? [...activas, { codigo: d.modalidad, nombre: `${d.modalidad} (dada de baja)` }]
      : activas;
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [deApi, setDeApi] = useState<{ campos: Partial<Record<CampoFile, string>>; general: string | null }>({
    campos: {},
    general: null,
  });
  const errores = { ...(enviado ? validarDatosFile(normalizarDatosFile(d), !editando) : {}), ...deApi.campos };
  const set = (p: Partial<DatosCrearFile>) => {
    setD({ ...d, ...p });
    // Al corregir un campo, su error de la API deja de valer.
    setDeApi((a) => ({ ...a, campos: Object.fromEntries(Object.entries(a.campos).filter(([k]) => !(k in p))) }));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    const datos = normalizarDatosFile(d);
    if (Object.keys(validarDatosFile(datos, !editando)).length) return;
    setGuardando(true);
    setDeApi({ campos: {}, general: null });
    try {
      await onGuardar(datos);
    } catch (err) {
      setDeApi(erroresDelFormularioFile(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      {deApi.general && (
        <Alerta tipo="error" className="mb-4">
          {deApi.general}
        </Alerta>
      )}
      <fieldset disabled={soloLectura} className="grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Input
            label="CI"
            value={d.ci}
            onChange={(e) => set({ ci: e.target.value })}
            error={errores.ci}
            inputMode="numeric"
            disabled={editando}
            hint={editando ? 'El CI no se edita.' : undefined}
          />
          <Input
            label="Complemento"
            value={d.complemento}
            onChange={(e) => set({ complemento: e.target.value.toUpperCase() })}
            error={errores.complemento}
            disabled={editando}
          />
        </div>
        <Input
          label="Código de estudiante"
          value={d.codigo}
          placeholder="209-AUM05030000"
          onChange={(e) => set({ codigo: e.target.value })}
          error={errores.codigo}
          hint="Como en la matrícula: 209 (UA Ancocagua) + iniciales + fecha de nacimiento + 00."
        />
        <Input
          label="Nombres"
          value={d.nombres}
          onChange={(e) => set({ nombres: e.target.value })}
          error={errores.nombres}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Apellido paterno"
            value={d.apellidoPaterno ?? ''}
            onChange={(e) => set({ apellidoPaterno: e.target.value })}
            error={errores.apellidoPaterno}
          />
          <Input
            label="Apellido materno"
            value={d.apellidoMaterno ?? ''}
            onChange={(e) => set({ apellidoMaterno: e.target.value })}
            error={errores.apellidoMaterno}
          />
        </div>
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={d.fechaNacimiento ?? ''}
          onChange={(e) => set({ fechaNacimiento: e.target.value })}
          error={errores.fechaNacimiento}
          hint={
            !editando && d.condicion === 'ESTUDIANTE'
              ? 'Con el file se crea su cuenta: usuario = CI, contraseña = esta fecha (dd-mm-aaaa), a cambiar al entrar.'
              : undefined
          }
        />
        <Input
          label="Celular"
          value={d.celular ?? ''}
          onChange={(e) => set({ celular: e.target.value })}
          error={errores.celular}
          inputMode="tel"
        />
        <Input
          label="Correo"
          type="email"
          value={d.email ?? ''}
          onChange={(e) => set({ email: e.target.value })}
          error={errores.email}
        />
        <Input
          label="Dirección"
          value={d.direccion ?? ''}
          onChange={(e) => set({ direccion: e.target.value })}
          error={errores.direccion}
        />
        <Select
          label="Especialidad"
          value={d.especialidadId}
          onChange={(e) => set({ especialidadId: Number(e.target.value) })}
          error={errores.especialidadId}
        >
          <option value={0}>Elige…</option>
          {especialidades.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre}
            </option>
          ))}
        </Select>
        <Input
          label="Año de ingreso"
          type="number"
          value={d.anioIngreso}
          onChange={(e) => set({ anioIngreso: Number(e.target.value) })}
          error={errores.anioIngreso}
        />
        <Select
          label="Condición"
          value={d.condicion}
          onChange={(e) => set({ condicion: e.target.value as CondicionFile })}
        >
          <option value="ESTUDIANTE">Estudiante</option>
          <option value="EGRESADO">Egresado</option>
        </Select>
        <Select
          label="Género"
          value={d.genero ?? ''}
          onChange={(e) => set({ genero: (e.target.value || null) as Genero | null })}
          hint="Decide si se pide la libreta militar."
        >
          <option value="">Sin indicar</option>
          <option value="FEMENINO">Femenino</option>
          <option value="MASCULINO">Masculino</option>
        </Select>
        <Select
          label="Modalidad de ingreso"
          value={d.modalidad ?? ''}
          onChange={(e) => set({ modalidad: (e.target.value || null) as Modalidad | null })}
          error={errores.modalidad}
          hint="Como en el folder personal. Obligatoria para un estudiante."
        >
          <option value="">Sin indicar</option>
          {opcionesModalidad.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nombre === `Modalidad ${m.codigo}` ? m.codigo : `${m.codigo} · ${m.nombre}`}
            </option>
          ))}
        </Select>
        <Select
          label="Año de formación"
          value={d.anioFormacion ?? ''}
          onChange={(e) => set({ anioFormacion: e.target.value ? Number(e.target.value) : null })}
          error={errores.anioFormacion}
          hint="El año que cursa: decide si un TACFI está atrasado."
        >
          <option value="">Sin indicar</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {['Primero', 'Segundo', 'Tercero', 'Cuarto', 'Quinto'][n - 1]}
            </option>
          ))}
        </Select>
      </fieldset>
      {!soloLectura && (
        <div className="mt-5 flex justify-end">
          <Button type="submit" icon={Save} loading={guardando}>
            Guardar
          </Button>
        </div>
      )}
    </form>
  );
}
