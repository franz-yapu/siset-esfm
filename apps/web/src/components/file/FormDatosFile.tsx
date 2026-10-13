import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import type { FileAcademico } from '@/types';
import type { DatosFile } from '@/services/files.service';
import { ESPECIALIDADES } from '@/config/catalogos';
import { Button, Input, Select } from '@/components/ui';

type Errores = Partial<Record<keyof DatosFile, string>>;

const vacio: DatosFile = {
  ci: '',
  nombres: '',
  apellidos: '',
  codigo: '',
  especialidad: '',
  anioIngreso: new Date().getFullYear(),
  condicion: 'ESTUDIANTE',
  fechaNacimiento: '',
  celular: '',
  correo: '',
};

const validar = (d: DatosFile): Errores => {
  const e: Errores = {};
  if (!/^\d{5,10}(-[0-9A-Z]{1,2})?$/.test(d.ci.trim())) e.ci = 'CI inválido (solo números, ej. 7012345 o 7012345-1A)';
  if (!d.nombres.trim()) e.nombres = 'Obligatorio';
  if (!d.apellidos.trim()) e.apellidos = 'Obligatorio';
  if (!/^EST-\d{4}-\d{4}$/.test(d.codigo.trim())) e.codigo = 'Formato EST-AAAA-NNNN';
  if (!d.especialidad) e.especialidad = 'Elige una especialidad';
  if (d.anioIngreso < 2000 || d.anioIngreso > new Date().getFullYear()) e.anioIngreso = 'Año fuera de rango';
  if (d.celular && !/^[67]\d{7}$/.test(d.celular)) e.celular = '8 dígitos, empieza con 6 o 7';
  if (d.correo && !/^\S+@\S+\.\S+$/.test(d.correo)) e.correo = 'Correo inválido';
  return e;
};

interface Props {
  inicial?: FileAcademico;
  conCuenta?: boolean;
  soloLectura?: boolean;
  onGuardar: (d: DatosFile, crearCuenta: boolean) => Promise<void>;
}

/** Formulario de datos personales del file (P-42 y pestaña "Datos personales" de P-41). */
export function FormDatosFile({ inicial, conCuenta, soloLectura, onGuardar }: Props) {
  const [d, setD] = useState<DatosFile>(
    inicial
      ? {
          ci: inicial.ci,
          nombres: inicial.nombres,
          apellidos: inicial.apellidos,
          codigo: inicial.codigo,
          especialidad: inicial.especialidad,
          anioIngreso: inicial.anioIngreso,
          condicion: inicial.condicion,
          fechaNacimiento: inicial.fechaNacimiento ?? '',
          celular: inicial.celular ?? '',
          correo: inicial.correo ?? '',
        }
      : vacio,
  );
  const [cuenta, setCuenta] = useState(true);
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const errores = enviado ? validar(d) : {};
  const set = (p: Partial<DatosFile>) => setD({ ...d, ...p });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    if (Object.keys(validar(d)).length) return;
    setGuardando(true);
    try {
      await onGuardar(d, conCuenta ? cuenta : false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} noValidate>
      <fieldset disabled={soloLectura} className="grid gap-4 md:grid-cols-2">
        <Input
          label="CI"
          value={d.ci}
          onChange={(e) => set({ ci: e.target.value })}
          error={errores.ci}
          inputMode="numeric"
        />
        <Input
          label="Código de estudiante"
          placeholder="EST-2026-0001"
          value={d.codigo}
          onChange={(e) => set({ codigo: e.target.value.toUpperCase() })}
          error={errores.codigo}
        />
        <Input
          label="Nombres"
          value={d.nombres}
          onChange={(e) => set({ nombres: e.target.value })}
          error={errores.nombres}
        />
        <Input
          label="Apellidos"
          value={d.apellidos}
          onChange={(e) => set({ apellidos: e.target.value })}
          error={errores.apellidos}
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={d.fechaNacimiento}
          onChange={(e) => set({ fechaNacimiento: e.target.value })}
        />
        <Input
          label="Celular"
          value={d.celular}
          onChange={(e) => set({ celular: e.target.value })}
          error={errores.celular}
          inputMode="tel"
        />
        <Input
          label="Correo"
          type="email"
          value={d.correo}
          onChange={(e) => set({ correo: e.target.value })}
          error={errores.correo}
        />
        <Select
          label="Especialidad"
          value={d.especialidad}
          onChange={(e) => set({ especialidad: e.target.value })}
          error={errores.especialidad}
        >
          <option value="">Elige…</option>
          {ESPECIALIDADES.map((x) => (
            <option key={x}>{x}</option>
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
          onChange={(e) => set({ condicion: e.target.value as DatosFile['condicion'] })}
        >
          <option value="ESTUDIANTE">Estudiante</option>
          <option value="EGRESADO">Egresado</option>
        </Select>
        {conCuenta && (
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primario"
              checked={cuenta}
              onChange={(e) => setCuenta(e.target.checked)}
            />
            <span>
              <span className="font-medium">Crear cuenta de acceso</span>
              <br />
              <span className="text-slate-500">
                Usuario = CI, contraseña temporal. Deberá cambiarla en su primer ingreso.
              </span>
            </span>
          </label>
        )}
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
