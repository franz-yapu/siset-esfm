import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { FileAcademico, TipoDocumento } from '@/types';
import { fechaLarga, hoy, ordinal } from '@/lib/formato';
import { nombreCompleto } from '@/lib/reglas';
import { ESTADO_MINISTERIO, INSTITUCION, NOMBRE_ESCUELA, UNIDAD_ACADEMICA } from '@/config/institucion';
import { Escudo } from '@/components/marca/Escudo';

/** Hoja tamaño carta con encabezado institucional y marca de agua opcional (P-45). */
export function HojaCarta({ children, vistaPrevia }: { children: ReactNode; vistaPrevia?: boolean }) {
  return (
    <article className="relative mx-auto aspect-[8.5/11] w-full max-w-[8.5in] overflow-hidden bg-white p-[7%] text-[13px] leading-relaxed text-tinta shadow ring-1 ring-slate-200 print:aspect-auto print:shadow-none print:ring-0">
      {vistaPrevia && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-35 text-[clamp(2rem,9vw,5.5rem)] font-black tracking-widest whitespace-nowrap text-red-500/15 select-none">
            VISTA PREVIA
          </span>
        </div>
      )}
      <header className="relative border-b-2 border-slate-900 pb-3 text-center text-[11px] leading-snug uppercase">
        <Escudo uso="impresion" className="absolute top-0 left-0 size-[0.75in]" />
        <p className="font-bold">{ESTADO_MINISTERIO}</p>
        <p>{INSTITUCION}</p>
        <p className="font-semibold">{NOMBRE_ESCUELA}</p>
        <p>{UNIDAD_ACADEMICA}</p>
      </header>
      {children}
    </article>
  );
}

function Firmas() {
  return (
    <div className="mt-16 grid grid-cols-2 gap-10 text-center text-[11px]">
      <div className="border-t border-slate-900 pt-1">Responsable de Archivo Kardex</div>
      <div className="border-t border-slate-900 pt-1">Director(a) General</div>
    </div>
  );
}

const Lugar = () => <p className="mt-6 text-right">Ancocagua, {fechaLarga(hoy())}</p>;

export function PlantillaHistorial({ f }: { f: FileAcademico }) {
  return (
    <>
      <h1 className="mt-6 text-center text-base font-bold uppercase">Historial académico</h1>
      <p className="mt-4">
        La Unidad Académica certifica que <strong>{nombreCompleto(f)}</strong>, con C.I. <strong>{f.ci}</strong> y
        código {f.codigo}, cursó la especialidad de <strong>{f.especialidad}</strong> con el siguiente registro:
      </p>
      <table className="mt-4 w-full border border-slate-900 text-[12px]">
        <thead>
          <tr className="bg-[#eef1f4] [&_th]:border [&_th]:border-slate-900 [&_th]:px-2 [&_th]:py-1">
            <th>Año de formación</th>
            <th>Gestión</th>
            <th>Resultado</th>
            <th>UF reprobadas</th>
          </tr>
        </thead>
        <tbody>
          {f.matriculas.map((m) => {
            const r = f.resultados.find((x) => x.anio === m.anio);
            return (
              <tr key={m.anio} className="text-center [&_td]:border [&_td]:border-slate-900 [&_td]:px-2 [&_td]:py-1">
                <td>{ordinal(m.anio)} año</td>
                <td>{m.gestion}</td>
                <td>{r ? (r.resultado === 'APROBADO' ? 'Aprobado' : 'Reprobado') : 'En curso'}</td>
                <td>{r?.ufReprobadas ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Lugar />
      <Firmas />
    </>
  );
}

export function PlantillaTCLO({ f }: { f: FileAcademico }) {
  const r = f.requisitos.TCLO;
  return (
    <>
      <h1 className="mt-6 text-center text-base font-bold uppercase">Certificación TCLO</h1>
      <p className="mt-6">
        Se certifica que <strong>{nombreCompleto(f)}</strong>, con C.I. <strong>{f.ci}</strong>, de la especialidad de{' '}
        {f.especialidad}, acreditó el nivel <strong>{r.nivel ?? '—'}</strong> según certificado N.º{' '}
        <strong>{r.nro ?? '—'}</strong>.
      </p>
      <p className="mt-3 text-[11px] text-suave">
        (Texto provisional: la definición oficial de TCLO está pendiente, D-04.)
      </p>
      <Lugar />
      <Firmas />
    </>
  );
}

export function PlantillaTACFI({ f }: { f: FileAcademico }) {
  return (
    <>
      <h1 className="mt-6 text-center text-base font-bold uppercase">Constancia TACFI</h1>
      <p className="mt-6">
        Se hace constar que <strong>{nombreCompleto(f)}</strong>, con C.I. <strong>{f.ci}</strong>, entregó en Kardex la
        documentación TACFI en fecha {f.requisitos.TACFI.fecha ? fechaLarga(f.requisitos.TACFI.fecha) : '—'}.
      </p>
      <p className="mt-3 text-[11px] text-suave">
        (Texto provisional: la definición oficial de TACFI está pendiente, D-04.)
      </p>
      <Lugar />
      <Firmas />
    </>
  );
}

export function Documento({
  tipo,
  file,
  vistaPrevia,
}: {
  tipo: TipoDocumento;
  file: FileAcademico;
  vistaPrevia?: boolean;
}) {
  return (
    <HojaCarta vistaPrevia={vistaPrevia}>
      {tipo === 'HISTORIAL' ? (
        <PlantillaHistorial f={file} />
      ) : tipo === 'TCLO' ? (
        <PlantillaTCLO f={file} />
      ) : (
        <PlantillaTACFI f={file} />
      )}
    </HojaCarta>
  );
}

/**
 * Zona que solo se ve al imprimir (oculta el resto de la app con CSS). Una `prioritaria` (p. ej. el comprobante abierto
 * en un modal) deja fuera a las demás de la pantalla, como la hoja del folder de la cabecera del file.
 */
export function ZonaImpresion({ children, prioritaria = false }: { children: ReactNode; prioritaria?: boolean }) {
  return createPortal(
    <div className={prioritaria ? 'zona-impresion zona-prioritaria' : 'zona-impresion'}>{children}</div>,
    document.body,
  );
}
