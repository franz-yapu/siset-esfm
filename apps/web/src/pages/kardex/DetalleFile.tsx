import { useState } from 'react';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAsync, usePermiso, usePermisos, useToast, useUsuario } from '@/hooks';
import { claveFiles, useEspecialidades, useFile, useMutacionFiles } from '@/hooks/useFiles';
import type { DatosCrearFile } from '@/types/files';
import { filesService } from '@/services/files.service';
import { filesPrototipoService } from '@/services/files-prototipo.service';
import { bitacoraService } from '@/services/bitacora.service';
import { todoMock } from '@/services/_modo';
import { cambiosDeFile } from '@/lib/files';
import { semaforoFile } from '@/lib/reglas';
import { fechaHora } from '@/lib/formato';
import { ACCIONES, esAccion } from '@/config/auditoria';
import { Alerta, Card, Cargando, DataTable, Tabs } from '@/components/ui';
import { CabeceraFile } from '@/components/file/CabeceraFile';
import { datosDeFile, FormDatosFile } from '@/components/file/FormDatosFile';
import { SeccionesDemoFile, type TabDemo } from '@/components/file/SeccionesDemoFile';
import { BloqueoFile } from '@/components/file/BloqueoFile';
import { RequisitosFile } from '@/components/file/RequisitosFile';

type Tab = 'datos' | 'requisitos' | 'historial-api' | TabDemo;

/** Historial del file desde la bitácora (solo KARDEX la lee, DEC-015). */
function HistorialFile({ fileId }: { fileId: number }) {
  const { data, loading } = useAsync(
    () => bitacoraService.listar({ entidad: 'file_academico', entidadId: String(fileId) }, 1, 50),
    [fileId],
  );
  return (
    <DataTable
      data={data?.datos ?? []}
      loading={loading}
      rowKey={(r) => r.id}
      vacio="Sin cambios registrados"
      columns={[
        { key: 'fecha', header: 'Fecha', principal: true, render: (r) => fechaHora(r.fecha) },
        { key: 'usuario', header: 'Usuario', render: (r) => r.usuario?.nombre ?? '—' },
        {
          key: 'accion',
          header: 'Acción',
          render: (r) => (esAccion(r.accion) ? ACCIONES[r.accion].etiqueta : r.accion),
        },
        {
          key: 'cambio',
          header: 'Cambio',
          render: (r) => <code className="text-xs break-all text-slate-500">{JSON.stringify(r.despues)}</code>,
        },
      ]}
    />
  );
}

/**
 * P-41 · Detalle del file (S2.10). Datos personales y académicos contra GET/PATCH /files; bloqueo y desbloqueo
 * (S2.6, D-07b); requisitos (S2.4). Matrículas, resultados y trámites solo en la demo (DEC-028).
 */
export function DetalleFile() {
  const { id = '' } = useParams();
  const fileId = Number(id);
  const u = useUsuario();
  const toast = useToast();
  const cliente = useQueryClient();
  const demo = todoMock();
  const editable = usePermiso('editar-file');
  const leeBitacora = usePermiso('bitacora');
  const { puede } = usePermisos();
  // SEC_DIR no ve requisitos (DEC-015); solo KARDEX los registra.
  const leeRequisitos = puede({ recurso: 'requisitos', accion: 'leer' });
  const registraRequisitos = puede({ recurso: 'requisitos', accion: 'editar' });
  const [tab, setTab] = useState<Tab>('datos');
  const { data: f, isLoading, error } = useFile(fileId);
  const { data: especialidades = [] } = useEspecialidades();
  // En la demo, la cabecera muestra el semáforo del prototipo.
  const { data: prototipo, reload } = useAsync(
    () => (demo ? filesPrototipoService.obtener(fileId) : Promise.resolve(undefined)),
    [fileId, demo],
  );
  const editar = useMutacionFiles((d: DatosCrearFile) =>
    filesService.editar(fileId, cambiosDeFile(datosDeFile(f!), d), u),
  );
  const alCambiar = () => {
    reload();
    void cliente.invalidateQueries({ queryKey: claveFiles });
  };

  if (isLoading) return <Cargando />;
  if (error || !f) return <Alerta tipo="error">{error?.message ?? 'El file no existe.'}</Alerta>;

  const guardar = async (d: DatosCrearFile) => {
    if (Object.keys(cambiosDeFile(datosDeFile(f), d)).length === 0) {
      toast.success('Sin cambios');
      return;
    }
    await editar.mutateAsync(d);
    toast.success('Datos actualizados');
    reload();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'datos', label: 'Datos personales' },
    ...(leeRequisitos ? ([{ id: 'requisitos', label: 'Requisitos' }] as const) : []),
    ...(demo
      ? ([
          { id: 'matriculas', label: 'Matrículas' },
          { id: 'resultados', label: 'Resultados anuales' },
          { id: 'tramites', label: 'Trámites' },
          { id: 'historial', label: 'Historial' },
        ] as const)
      : leeBitacora
        ? ([{ id: 'historial-api', label: 'Historial' }] as const)
        : []),
  ];

  return (
    <>
      <CabeceraFile
        file={{ ...f, semaforo: prototipo ? semaforoFile(prototipo) : undefined }}
        acciones={editable && <BloqueoFile file={f} />}
      />
      {!demo && (
        <Alerta tipo="info" className="mb-4">
          Las matrículas se habilitan en una próxima versión, cuando la escuela confirme si se registran (D-30).
        </Alerta>
      )}
      <Card>
        <Tabs activa={tab} onChange={(t) => setTab(t as Tab)} className="mb-4" tabs={tabs} />
        {tab === 'datos' && (
          <FormDatosFile
            key={JSON.stringify(f)}
            inicial={f}
            especialidades={especialidades}
            soloLectura={!editable}
            onGuardar={guardar}
          />
        )}
        {tab === 'requisitos' && <RequisitosFile fileId={f.id} editable={registraRequisitos} />}
        {tab === 'historial-api' && <HistorialFile fileId={f.id} />}
        {tab !== 'datos' && tab !== 'requisitos' && tab !== 'historial-api' && (
          <SeccionesDemoFile fileId={f.id} tab={tab} editable={editable} onCambio={alCambiar} />
        )}
      </Card>
    </>
  );
}
