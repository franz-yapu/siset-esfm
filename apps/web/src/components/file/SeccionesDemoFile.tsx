import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import type { ResultadoAnual } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { filesPrototipoService } from '@/services/files-prototipo.service';
import { hojasRutaPrototipoService } from '@/services/hojasRuta-prototipo.service';
import { superaLimite } from '@/lib/reglas';
import { fecha, fechaHora } from '@/lib/formato';
import { Button, Cargando, DataTable, EstadoBadge } from '@/components/ui';
import { TablaMatriculas, TablaResultados } from './TablasFile';
import { ModalMatricula, ModalResultado } from './ModalesFile';

// Secciones de P-41 que solo existen en la demo (SDD S2.9-S2.10 §2.4, DEC-028): leen el modelo del
// prototipo. Con la API se ocultan: matrículas (D-30) y resultados (D-07: no aplican). Los requisitos ya
// están conectados (S2.4, `RequisitosFile`). Este archivo desaparece cuando esas pantallas se conecten.

export type TabDemo = 'matriculas' | 'resultados' | 'tramites' | 'historial';

type ModalAbierto = 'matricula' | 'resultado' | null;

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
        hojasRutaPrototipoService.listar(),
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
    </>
  );
}
