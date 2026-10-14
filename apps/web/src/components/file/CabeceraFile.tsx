import type { ReactNode } from 'react';
import type { ColorSemaforo, FileAcademico } from '@/types';
import { iniciales } from '@/lib/formato';
import { nombreCompleto, semaforoFile } from '@/lib/reglas';
import { Alerta, Badge, Semaforo } from '@/components/ui';

/** Lo que muestra la cabecera: sirve para el file de la API y para el del prototipo (DEC-028). */
export interface DatosCabeceraFile {
  nombre: string;
  ci: string;
  codigo: string;
  especialidad: string;
  anioIngreso: number;
  condicion: 'ESTUDIANTE' | 'EGRESADO';
  bloqueado: boolean;
  motivoBloqueo?: string | null;
  /** Solo con el modelo del prototipo: el semáforo de la API llega con S2.5. */
  semaforo?: ColorSemaforo;
}

/** La cabecera de un file del prototipo, con su semáforo. */
export const cabeceraDePrototipo = (f: FileAcademico): DatosCabeceraFile => ({
  ...f,
  nombre: nombreCompleto(f),
  semaforo: semaforoFile(f),
});

/** Cabecera del file (P-20 y P-41): iniciales, datos y, si lo hay, el semáforo global. */
export function CabeceraFile({ file: f, acciones }: { file: DatosCabeceraFile; acciones?: ReactNode }) {
  const nombre = f.nombre;
  const datos: [string, ReactNode][] = [
    ['CI', f.ci],
    ['Código', f.codigo],
    ['Especialidad', f.especialidad],
    ['Año de ingreso', f.anioIngreso],
  ];
  return (
    <div className="mb-5 space-y-3">
      {f.bloqueado && (
        <Alerta tipo="bloqueo" titulo="File bloqueado">
          {f.motivoBloqueo ? `${f.motivoBloqueo}. ` : ''}No se puede dictaminar ni emitir documentos. Acércate a Kardex.
        </Alerta>
      )}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primario text-xl font-semibold text-white">
          {iniciales(nombre)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{nombre}</h1>
            <Badge>{f.condicion === 'EGRESADO' ? 'Egresado' : 'Estudiante'}</Badge>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
            {datos.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {f.semaforo && <Semaforo color={f.semaforo} size="lg" />}
          {acciones}
        </div>
      </div>
    </div>
  );
}
