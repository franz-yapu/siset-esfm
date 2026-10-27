import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { ColorSemaforo, FileAcademico } from '@/types';
import type { FileOMio } from '@/types/files';
import { iniciales } from '@/lib/formato';
import { nombreCompleto, semaforoFile } from '@/lib/reglas';
import { textoSemaforo } from '@/lib/semaforo';
import { Alerta, Badge, Semaforo } from '@/components/ui';
import { FotoFile } from './FotoFile';

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
  /** El semáforo global; `null` en el egresado, que no tiene requisitos (DEC-060). */
  semaforo?: ColorSemaforo | null;
}

/** La cabecera de un file del prototipo, con su semáforo. */
export const cabeceraDePrototipo = (f: FileAcademico): DatosCabeceraFile => ({
  ...f,
  nombre: nombreCompleto(f),
  semaforo: semaforoFile(f),
});

/** Cabecera del file (P-20 y P-41): foto o iniciales, datos y, si lo hay, el semáforo global. */
export function CabeceraFile({
  file: f,
  acciones,
  foto,
}: {
  file: DatosCabeceraFile;
  acciones?: ReactNode;
  /** Con la API: el file y la fecha de su foto (ADR-0013); sin esto, las iniciales. */
  foto?: { id: FileOMio; version: string | null };
}) {
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
      <div className="flex flex-col gap-4 rounded-[10px] border border-borde bg-white p-4 sm:flex-row sm:items-center">
        {foto ? (
          <FotoFile id={foto.id} version={foto.version} nombre={nombre} />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e4edf6] text-base font-medium text-[#173b5c]">
            {iniciales(nombre)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] leading-7 font-semibold text-tinta">{nombre}</h1>
            <Badge>{f.condicion === 'EGRESADO' ? 'Egresado' : 'Estudiante'}</Badge>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-4">
            {datos.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[13px] text-suave">{k}</dt>
                <dd className={clsx('text-tinta', (k === 'CI' || k === 'Código') && 'font-mono text-[13px]')}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {f.semaforo && <Semaforo color={f.semaforo} texto={textoSemaforo(f.semaforo, f.bloqueado)} />}
          {acciones}
        </div>
      </div>
    </div>
  );
}
