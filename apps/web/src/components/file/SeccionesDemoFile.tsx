import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Lock, LockOpen, Plus } from 'lucide-react';
import type { CodigoRequisito, Requisito, ResultadoAnual } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { filesPrototipoService } from '@/services/files-prototipo.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { CODIGOS_REQUISITO, NOMBRE_REQUISITO, semaforoRequisito, superaLimite } from '@/lib/reglas';
import { fecha, fechaHora } from '@/lib/formato';
import { Button, Cargando, DataTable, EstadoBadge, Semaforo } from '@/components/ui';
import { TablaMatriculas, TablaResultados } from './TablasFile';
import { ModalBloqueo, ModalMatricula, ModalRequisito, ModalResultado } from './ModalesFile';

// Secciones de P-41 que solo existen en la demo (SDD S2.9-S2.10 §2.4, DEC-028): leen el modelo del
// prototipo. Con la API se ocultan hasta S2.3 (matrículas, resultados, bloqueo; D-07b) y S2.4 (requisitos;
// D-04, D-18). Este archivo desaparece cuando esas pantallas se conecten.

export type TabDemo = 'matriculas' | 'resultados' | 'requisitos' | 'tramites' | 'historial';

type ModalAbierto = 'matricula' | 'resultado' | CodigoRequisito | null;

const ACCION_REQ: Record<CodigoRequisito, string> = {
  TACFI: 'Registrar recepción física',
  TCLO: 'Registrar certificado',
  CERT_NOTAS: 'Registrar',
};

interface Props {
  fileId: number;
  tab: TabDemo;
  editable: boolean;
  /** Después de cada escritura: el detalle conectado vuelve a leer el file. */
  onCambio: () => void;
}

export function SeccionesDemoFile({ fileId, tab, editable, onCambio }: Props) {
  const u = useUsuario();
  const nav = useNavigate();
  const [modal, setModal] = useState<ModalAbierto>(null);
  const { ejecutar, ocupado } = useAccion();
  const { data, loading, reload } = useAsync(
    () =>
      Promise.all([
        filesPrototipoService.obtener(fileId),
        hojasRutaService.listar(),
        filesPrototipoService.historial(fileId),
      ]),
    [fileId],
  );
  if (loading && !data) return <Cargando />;
  if (!data) return null;
  const [f, todas, historial] = data;
  const tramites = todas.filter((h) => h.fileId === f.id);

  const hacer = async (fn: () => Promise<unknown>, msg: string) => {
    if (await ejecutar(fn, msg)) {
      setModal(null);
      reload();
      onCambio();
    }
  };
  const resultado = (r: ResultadoAnual) =>
    hacer(
      () => filesPrototipoService.registrarResultado(f.id, r, u),
      superaLimite(r) ? 'Resultado registrado: el file quedó BLOQUEADO' : 'Resultado registrado',
    );
  const requisito = (c: CodigoRequisito, r: Requisito) =>
    hacer(() => filesPrototipoService.registrarRequisito(f.id, c, r, u), `${NOMBRE_REQUISITO[c]} registrado`);

  return (
    <>
      {tab === 'matriculas' && (
        <>
          {editable && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" icon={Plus} onClick={() => setModal('matricula')}>
                Registrar matrícula
              </Button>
            </div>
          )}
          <TablaMatriculas file={f} />
        </>
      )}
      {tab === 'resultados' && (
        <>
          {editable && (
            <div className="mb-3 flex justify-end">
              <Button size="sm" icon={Plus} onClick={() => setModal('resultado')}>
                Registrar resultado
              </Button>
            </div>
          )}
          <TablaResultados file={f} />
        </>
      )}
      {tab === 'requisitos' && (
        <div className="grid gap-3 md:grid-cols-3">
          {CODIGOS_REQUISITO.map((c) => {
            const r = f.requisitos[c];
            return (
              <div key={c} className="flex flex-col rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">{NOMBRE_REQUISITO[c]}</h3>
                  <Semaforo
                    color={semaforoRequisito(r)}
                    texto={r.estado === 'COMPLETO' ? 'Completo' : 'Pendiente'}
                    size="sm"
                  />
                </div>
                <dl className="mt-2 flex-1 space-y-0.5 text-sm text-slate-600">
                  {r.nivel && <div>Nivel: {r.nivel}</div>}
                  {r.nro && <div>N.º: {r.nro}</div>}
                  {r.fecha && <div>Fecha: {fecha(r.fecha)}</div>}
                  {r.responsable && <div>Recibido por: {r.responsable}</div>}
                  {r.estado === 'PENDIENTE' && <div className="text-amber-700">Aún no registrado</div>}
                </dl>
                {editable && (
                  <Button
                    size="sm"
                    variant={r.estado === 'PENDIENTE' ? 'primary' : 'secondary'}
                    className="mt-3"
                    onClick={() => setModal(c)}
                  >
                    {r.estado === 'PENDIENTE' ? ACCION_REQ[c] : 'Actualizar'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab === 'tramites' && (
        <DataTable
          data={tramites}
          rowKey={(h) => h.nro}
          vacio="Sin trámites"
          onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
          columns={[
            {
              key: 'nro',
              header: 'N.º HR',
              principal: true,
              render: (h) => <span className="font-medium">{h.nro}</span>,
            },
            { key: 'tipo', header: 'Tipo' },
            { key: 'ingreso', header: 'Ingreso', render: (h) => fecha(h.fechaIngreso) },
            { key: 'estado', header: 'Estado', render: (h) => <EstadoBadge estado={h.estado} /> },
          ]}
        />
      )}
      {tab === 'historial' && (
        <DataTable
          data={historial}
          rowKey={(r) => r.id}
          vacio="Sin cambios registrados"
          columns={[
            { key: 'fecha', header: 'Fecha', principal: true, render: (r) => fechaHora(r.fecha) },
            { key: 'usuario', header: 'Usuario' },
            { key: 'accion', header: 'Acción' },
            {
              key: 'cambio',
              header: 'Cambio',
              render: (r) => <code className="text-xs break-all text-slate-500">{JSON.stringify(r.despues)}</code>,
            },
          ]}
        />
      )}

      {modal === 'matricula' && (
        <ModalMatricula
          file={f}
          ocupado={ocupado}
          onCerrar={() => setModal(null)}
          onGuardar={(anio, gestion) =>
            hacer(
              () => filesPrototipoService.registrarMatricula(f.id, { anio, gestion, estado: 'Vigente' }, u),
              'Matrícula registrada',
            )
          }
        />
      )}
      {modal === 'resultado' && (
        <ModalResultado file={f} ocupado={ocupado} onCerrar={() => setModal(null)} onGuardar={resultado} />
      )}
      {(modal === 'TACFI' || modal === 'TCLO' || modal === 'CERT_NOTAS') && (
        <ModalRequisito
          codigo={modal}
          responsable={u.nombre}
          ocupado={ocupado}
          onCerrar={() => setModal(null)}
          onGuardar={(r) => requisito(modal, r)}
        />
      )}
    </>
  );
}

/** Bloquear o desbloquear en la demo (con la API llega con S2.3, D-07b). */
export function BotonBloqueoDemo({
  fileId,
  bloqueado,
  onCambio,
}: {
  fileId: number;
  bloqueado: boolean;
  onCambio: () => void;
}) {
  const u = useUsuario();
  const [abierto, setAbierto] = useState(false);
  const { ejecutar, ocupado } = useAccion();
  return (
    <>
      <Button
        size="sm"
        variant={bloqueado ? 'success' : 'danger'}
        icon={bloqueado ? LockOpen : Lock}
        onClick={() => setAbierto(true)}
      >
        {bloqueado ? 'Desbloquear' : 'Bloquear'}
      </Button>
      {abierto && (
        <ModalBloqueo
          bloquear={!bloqueado}
          ocupado={ocupado}
          onCerrar={() => setAbierto(false)}
          onGuardar={async (m) => {
            const ok = await ejecutar(
              () => filesPrototipoService.cambiarBloqueo(fileId, !bloqueado, m, u),
              bloqueado ? 'File desbloqueado' : 'File bloqueado',
            );
            if (ok) {
              setAbierto(false);
              onCambio();
            }
          }}
        />
      )}
    </>
  );
}
