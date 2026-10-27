import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAsync, usePermiso, usePermisos, useToast, useUsuario } from '@/hooks';
import { claveFiles, useEspecialidades, useFile, useMutacionFiles } from '@/hooks/useFiles';
import { useHojasRuta } from '@/hooks/useHojasRuta';
import type { DatosCrearFile } from '@/types/files';
import { filesService } from '@/services/files.service';
import { bitacoraService } from '@/services/bitacora.service';
import { todoMock } from '@/services/_modo';
import { cambiosDeFile } from '@/lib/files';
import { fecha, fechaHora } from '@/lib/formato';
import { ACCIONES, esAccion } from '@/config/auditoria';
import { Alerta, Card, Cargando, DataTable, EstadoHojaRutaBadge, Tabs } from '@/components/ui';
import { CabeceraFile } from '@/components/file/CabeceraFile';
import { datosDeFile, FormDatosFile } from '@/components/file/FormDatosFile';
import { SeccionesDemoFile, type TabDemo } from '@/components/file/SeccionesDemoFile';
import { BloqueoFile, ResolucionBloqueo } from '@/components/file/BloqueoFile';
import { RequisitosFile } from '@/components/file/RequisitosFile';
import { ImprimirFolder } from '@/components/file/HojaFolderPersonal';
import { useEntregas, useRequisitos } from '@/hooks/useRequisitos';
import { EntregasRequisitos } from '@/components/file/EntregasRequisitos';
import { EditorFoto } from '@/components/file/FotoFile';

type Tab = 'datos' | 'requisitos' | 'entregas' | 'tramites-api' | 'historial-api' | TabDemo;

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
          render: (r) => <code className="text-xs break-all text-suave">{JSON.stringify(r.despues)}</code>,
        },
      ]}
    />
  );
}

/** Las hojas de ruta del titular (DEC-045): la búsqueda por texto trae coincidencias de CI; se filtra por el file. */
function TramitesFile({ fileId, ci }: { fileId: number; ci: string }) {
  const nav = useNavigate();
  const { data, isLoading } = useHojasRuta({ texto: ci, porPagina: 100 });
  const filas = (data?.datos ?? []).filter((h) => h.titular.fileId === fileId);
  return (
    <DataTable
      data={filas}
      loading={isLoading}
      rowKey={(h) => h.nro}
      onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)}
      vacio="Sin trámites registrados"
      columns={[
        {
          key: 'nro',
          header: 'N.º HR',
          principal: true,
          render: (h) => <span className="font-mono text-[13px] font-medium whitespace-nowrap">{h.nro}</span>,
        },
        { key: 'tipo', header: 'Tipo', render: (h) => h.tipo.nombre },
        { key: 'estado', header: 'Estado', render: (h) => <EstadoHojaRutaBadge estado={h.estado} /> },
        { key: 'ingreso', header: 'Ingreso', ocultarEnMovil: true, render: (h) => fecha(h.fechaIngreso) },
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
  // SEC_DIR no ve requisitos (DEC-015); solo KARDEX los registra. El egresado no tiene (DEC-060).
  const registraRequisitos = puede({ recurso: 'requisitos', accion: 'editar' });
  const leeTramites = puede({ recurso: 'hojas-ruta', accion: 'leer' });
  const [tab, setTab] = useState<Tab>('datos');
  const { data: f, isLoading, error } = useFile(fileId);
  const leeRequisitos = puede({ recurso: 'requisitos', accion: 'leer' }) && f?.condicion !== 'EGRESADO';
  // Los mismos que muestra la pestaña (caché compartida): la hoja del folder para imprimir (DEC-062). Se piden al
  // abrir el file porque el botón está en la cabecera, a la vista (observación #4 del tutor, SDD OBS-T1).
  const requisitos = useRequisitos(fileId, leeRequisitos);
  const entregas = useEntregas(fileId, leeRequisitos && tab === 'entregas');
  const { data: especialidades = [] } = useEspecialidades();
  const editar = useMutacionFiles((d: DatosCrearFile) =>
    filesService.editar(fileId, cambiosDeFile(datosDeFile(f!), d), u),
  );
  const alCambiar = () => void cliente.invalidateQueries({ queryKey: claveFiles });

  if (isLoading) return <Cargando />;
  if (error || !f) return <Alerta tipo="error">{error?.message ?? 'El file no existe.'}</Alerta>;

  const guardar = async (d: DatosCrearFile) => {
    if (Object.keys(cambiosDeFile(datosDeFile(f), d)).length === 0) {
      toast.success('Sin cambios');
      return;
    }
    await editar.mutateAsync(d);
    toast.success('Datos actualizados');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'datos', label: 'Datos personales' },
    ...(leeRequisitos
      ? ([
          { id: 'requisitos', label: 'Requisitos' },
          { id: 'entregas', label: 'Entregas' },
        ] as const)
      : []),
    ...(demo
      ? ([
          { id: 'matriculas', label: 'Matrículas' },
          { id: 'resultados', label: 'Resultados anuales' },
          { id: 'tramites', label: 'Trámites' },
          { id: 'historial', label: 'Historial' },
        ] as const)
      : [
          ...(leeTramites ? ([{ id: 'tramites-api', label: 'Trámites' }] as const) : []),
          ...(leeBitacora ? ([{ id: 'historial-api', label: 'Historial' }] as const) : []),
        ]),
  ];

  return (
    <>
      <CabeceraFile
        file={f}
        foto={{ id: f.id, version: f.foto }}
        acciones={
          <>
            {leeRequisitos && <ImprimirFolder file={f} requisitos={requisitos.data} />}
            {editable && <BloqueoFile file={f} />}
          </>
        }
      />
      <ResolucionBloqueo file={f} sinMotivo className="mb-4" />
      {!demo && (
        <Alerta tipo="info" className="mb-4">
          Las matrículas se habilitan en una próxima versión, cuando la escuela confirme si se registran (D-30).
        </Alerta>
      )}
      <Card>
        <Tabs activa={tab} onChange={(t) => setTab(t as Tab)} className="mb-4" tabs={tabs} />
        {tab === 'datos' && editable && (
          <div className="mb-5 border-b border-regla pb-5">
            <EditorFoto id={f.id} version={f.foto} nombre={f.nombre} />
          </div>
        )}
        {tab === 'datos' && (
          <FormDatosFile
            key={JSON.stringify(f)}
            inicial={f}
            especialidades={especialidades}
            soloLectura={!editable}
            onGuardar={guardar}
          />
        )}
        {tab === 'requisitos' && leeRequisitos && <RequisitosFile fileId={f.id} editable={registraRequisitos} />}
        {tab === 'entregas' && leeRequisitos && (
          <EntregasRequisitos
            titular={f}
            entregas={entregas.data}
            cargando={entregas.isLoading}
            error={entregas.error}
          />
        )}
        {tab === 'tramites-api' && <TramitesFile fileId={f.id} ci={f.ci} />}
        {tab === 'historial-api' && <HistorialFile fileId={f.id} />}
        {tab !== 'datos' &&
          tab !== 'requisitos' &&
          tab !== 'entregas' &&
          tab !== 'tramites-api' &&
          tab !== 'historial-api' && (
            <SeccionesDemoFile fileId={f.id} tab={tab} editable={editable} onCambio={alCambiar} />
          )}
      </Card>
    </>
  );
}
