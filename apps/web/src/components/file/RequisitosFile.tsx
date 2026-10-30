import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { RegistroDeGestion, RequisitoDelFile } from '@/types/requisitos';
import { useUsuario } from '@/hooks';
import { useMisRequisitos, useRegistrarRequisito, useRequisitos } from '@/hooks/useRequisitos';
import { ETIQUETA_ESTADO, requisitosVisibles, yaRegistrado } from '@/lib/requisitos';
import { fecha, fechaHora, ordinal } from '@/lib/formato';
import { Alerta, Button, Cargando, Semaforo } from '@/components/ui';
import { ModalRequisitoFile } from './ModalRequisitoFile';

const COLOR = { COMPLETO: 'VERDE', OBSERVADO: 'ROJO', PENDIENTE: 'AMARILLO' } as const;

/** Por qué un requisito no se le pide a este file (ADR-0007). */
const noCorresponde = (r: RequisitoDelFile) =>
  r.soloGenero === 'MASCULINO'
    ? 'Solo varones'
    : r.soloModalidad
      ? `Solo modalidad ${r.soloModalidad}`
      : 'No corresponde';

function Detalle({ r }: { r: RequisitoDelFile }) {
  return (
    <>
      {r.nombreCurso && <div>Curso: {r.nombreCurso}</div>}
      {r.entidadEmisora && <div>Entidad emisora: {r.entidadEmisora}</div>}
      {r.fecha && <div>Fecha: {fecha(r.fecha)}</div>}
      {r.nroDocumento && <div>N.º: {r.nroDocumento}</div>}
      {r.observacion && <div className="text-amber-800">{r.observacion}</div>}
      {r.registradoPor && (
        <div className="text-xs text-suave">
          Registró: {r.registradoPor.nombre}
          {r.actualizado ? ` · ${fechaHora(r.actualizado)}` : ''}
        </div>
      )}
    </>
  );
}

/**
 * Pestaña Requisitos de P-41 (SDD S2.4 §2.4, DEC-051): los de la hoja "Documentación existente en folder personal"
 * que se le piden a este file (DEC-066), en su orden, con el estado de cada uno en el file. Los por gestión (matrícula, certificado de notas) muestran cada
 * gestión; los TACFI, el curso y la entidad emisora. Solo KARDEX registra; SEC_COORD y COORDINADOR leen (DEC-015).
 * `propio`: el estudiante, desde "mi file" (S2.7).
 */
export function RequisitosFile({
  fileId,
  editable,
  propio = false,
}: {
  fileId: number;
  editable: boolean;
  propio?: boolean;
}) {
  const u = useUsuario();
  const delFile = useRequisitos(fileId, !propio);
  const mios = useMisRequisitos(u, propio);
  const { data, isLoading, error } = propio ? mios : delFile;
  const registrar = useRegistrarRequisito(fileId, u);
  // `gestion`: la que se edita; null en un por gestión = agregar una nueva.
  const [abierto, setAbierto] = useState<{ requisito: RequisitoDelFile; gestion: RegistroDeGestion | null } | null>(
    null,
  );

  if (isLoading) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error?.message ?? 'No se pudieron leer los requisitos.'}</Alerta>;

  const visibles = requisitosVisibles(data, propio);
  const atrasados = visibles.filter((r) => r.atrasado);

  return (
    <div className="space-y-3">
      {atrasados.length > 0 && (
        <Alerta tipo="error" titulo="Requisitos atrasados">
          {atrasados.map((r) => r.nombre).join(', ')}: son de un año que el estudiante ya pasó (D-31).
        </Alerta>
      )}
      <ol className="divide-y divide-regla rounded-[10px] border border-borde">
        {visibles.map((r, i) => (
          <li
            key={r.codigo}
            aria-label={r.nombre}
            className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-start ${r.aplica ? '' : 'bg-[#f5f7fa] text-suave'}`}
          >
            <span className="w-7 shrink-0 text-sm font-semibold text-suave">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={`font-medium ${r.aplica ? 'text-tinta' : 'text-suave'}`}>{r.nombre}</h4>
                {r.anioFormacion && <span className="text-xs text-suave">{ordinal(r.anioFormacion)} año</span>}
                {!r.obligatorio && <span className="text-xs text-suave">(si corresponde)</span>}
                {r.atrasado && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">Atrasado</span>
                )}
              </div>
              {!r.aplica ? (
                <p className="text-sm">{noCorresponde(r)}</p>
              ) : r.porGestion ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {r.gestionesEsperadas !== null && (
                    <span className="text-xs text-suave">
                      {new Set(r.gestiones.map((g) => g.gestion.slice(-4))).size} de {r.gestionesEsperadas}{' '}
                      {r.gestionesEsperadas === 1 ? 'año' : 'años'}
                    </span>
                  )}
                  {r.gestiones.length === 0 && (
                    <span className="text-sm text-amber-700">Ninguna gestión registrada</span>
                  )}
                  {r.gestiones.map((g) => (
                    <button
                      key={g.gestion}
                      type="button"
                      disabled={!editable}
                      onClick={() => setAbierto({ requisito: r, gestion: g })}
                      className="rounded-[10px] border border-borde px-2 py-1 text-left text-sm enabled:hover:bg-[#f5f7fa]"
                      title={g.observacion ?? undefined}
                    >
                      <span className="font-medium">{g.gestion}</span> · {ETIQUETA_ESTADO[g.estado]}
                    </button>
                  ))}
                </div>
              ) : (
                <dl className="mt-1 space-y-0.5 text-sm text-suave">
                  <Detalle r={r} />
                  {r.estado === 'PENDIENTE' && !r.registradoPor && (
                    <div className="text-amber-700">Aún no registrado</div>
                  )}
                </dl>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
              {r.aplica && <Semaforo color={COLOR[r.estado]} texto={ETIQUETA_ESTADO[r.estado]} size="sm" />}
              {editable && r.aplica && (
                <Button
                  size="sm"
                  variant={r.estado === 'COMPLETO' ? 'secondary' : 'primary'}
                  icon={r.porGestion ? Plus : undefined}
                  onClick={() => setAbierto({ requisito: r, gestion: null })}
                  aria-label={
                    r.porGestion
                      ? `Agregar gestión de ${r.nombre}`
                      : `${yaRegistrado(r) ? 'Actualizar' : 'Registrar'} ${r.nombre}`
                  }
                >
                  {r.porGestion ? 'Agregar gestión' : yaRegistrado(r) ? 'Actualizar' : 'Registrar'}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {abierto && (
        <ModalRequisitoFile
          requisito={abierto.requisito}
          gestion={abierto.gestion}
          onCerrar={() => setAbierto(null)}
          onGuardar={async (datos) => {
            await registrar.mutateAsync({ codigo: abierto.requisito.codigo, datos });
            setAbierto(null);
          }}
        />
      )}
    </div>
  );
}
