import { useState } from 'react';
import type { RequisitoDelFile } from '@/types/requisitos';
import { useUsuario } from '@/hooks';
import { useRegistrarRequisito, useRequisitos } from '@/hooks/useRequisitos';
import { ETIQUETA_ESTADO } from '@/lib/requisitos';
import { fecha, fechaHora, ordinal } from '@/lib/formato';
import { Alerta, Button, Cargando, Semaforo } from '@/components/ui';
import { ModalRequisitoFile } from './ModalRequisitoFile';

const COLOR = { COMPLETO: 'VERDE', OBSERVADO: 'ROJO', PENDIENTE: 'AMARILLO' } as const;

/** Agrupa por año de formación; los requisitos sin año van al final ("Otros"). */
const grupos = (lista: RequisitoDelFile[]) => {
  const porAnio = new Map<number | null, RequisitoDelFile[]>();
  for (const r of lista) porAnio.set(r.anioFormacion, [...(porAnio.get(r.anioFormacion) ?? []), r]);
  return [...porAnio.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99));
};

/**
 * Pestaña Requisitos de P-41 (SDD S2.4 §2.4): el catálogo activo con el estado de cada requisito en el file.
 * Solo KARDEX registra; SEC_COORD y COORDINADOR leen (DEC-015).
 */
export function RequisitosFile({ fileId, editable }: { fileId: number; editable: boolean }) {
  const u = useUsuario();
  const { data, isLoading, error } = useRequisitos(fileId);
  const registrar = useRegistrarRequisito(fileId, u);
  const [abierto, setAbierto] = useState<RequisitoDelFile | null>(null);

  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudieron leer los requisitos.'}</Alerta>;

  return (
    <div className="space-y-5">
      {grupos(data).map(([anio, lista]) => (
        <section key={anio ?? 'otros'}>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{anio ? `${ordinal(anio)} año` : 'Otros'}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {lista.map((r) => (
              <article
                key={r.codigo}
                className="flex flex-col rounded-lg border border-slate-200 p-4"
                aria-label={r.nombre}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-900">{r.nombre}</h4>
                  <Semaforo color={COLOR[r.estado]} texto={ETIQUETA_ESTADO[r.estado]} size="sm" />
                </div>
                <dl className="mt-2 flex-1 space-y-0.5 text-sm text-slate-600">
                  {r.fecha && <div>Fecha: {fecha(r.fecha)}</div>}
                  {r.nroDocumento && <div>N.º: {r.nroDocumento}</div>}
                  {r.observacion && <div className="text-amber-800">{r.observacion}</div>}
                  {r.registradoPor && (
                    <div className="text-xs text-slate-500">
                      Registró: {r.registradoPor.nombre}
                      {r.actualizado ? ` · ${fechaHora(r.actualizado)}` : ''}
                    </div>
                  )}
                  {r.estado === 'PENDIENTE' && !r.registradoPor && (
                    <div className="text-amber-700">Aún no registrado</div>
                  )}
                </dl>
                {editable && (
                  <Button
                    size="sm"
                    variant={r.estado === 'COMPLETO' ? 'secondary' : 'primary'}
                    className="mt-3"
                    onClick={() => setAbierto(r)}
                  >
                    {r.registradoPor ? 'Actualizar' : 'Registrar'}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {abierto && (
        <ModalRequisitoFile
          requisito={abierto}
          onCerrar={() => setAbierto(null)}
          onGuardar={async (datos) => {
            await registrar.mutateAsync({ codigo: abierto.codigo, datos });
            setAbierto(null);
          }}
        />
      )}
    </div>
  );
}
