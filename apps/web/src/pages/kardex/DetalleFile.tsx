import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, LockOpen, Plus } from 'lucide-react';
import type { CodigoRequisito, Requisito, ResultadoAnual } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { filesService } from '@/services/files.service';
import { hojasRutaService } from '@/services/hojasRuta.service';
import { puedeEditarFiles } from '@/config/permisos';
import { CODIGOS_REQUISITO, NOMBRE_REQUISITO, semaforoRequisito, superaLimite } from '@/lib/reglas';
import { fecha, fechaHora } from '@/lib/formato';
import { Alerta, Button, Card, Cargando, DataTable, EstadoBadge, Semaforo, Tabs } from '@/components/ui';
import { CabeceraFile } from '@/components/file/CabeceraFile';
import { TablaMatriculas, TablaResultados } from '@/components/file/TablasFile';
import { FormDatosFile } from '@/components/file/FormDatosFile';
import { ModalBloqueo, ModalMatricula, ModalRequisito, ModalResultado } from '@/components/file/ModalesFile';

type ModalAbierto = 'matricula' | 'resultado' | 'bloqueo' | CodigoRequisito | null;

const ACCION_REQ: Record<CodigoRequisito, string> = { TACFI: 'Registrar recepción física', TCLO: 'Registrar certificado', CERT_NOTAS: 'Registrar' };

/** P-41 · Detalle del file. */
export function DetalleFile() {
  const { id = '' } = useParams();
  const u = useUsuario();
  const nav = useNavigate();
  const editable = puedeEditarFiles(u.rol);
  const [tab, setTab] = useState(editable ? 'requisitos' : 'datos');
  const [modal, setModal] = useState<ModalAbierto>(null);
  const { ejecutar, ocupado } = useAccion();
  const fileId = Number(id);
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([filesService.obtener(fileId), hojasRutaService.listar(), filesService.historial(fileId)]), [fileId]);

  if (loading && !data) return <Cargando />;
  if (error || !data) return <Alerta tipo="error">{error}</Alerta>;
  const [f, todas, historial] = data;
  const tramites = todas.filter((h) => h.fileId === f.id);

  const hacer = async (fn: () => Promise<unknown>, msg: string) => { if (await ejecutar(fn, msg)) { setModal(null); reload(); } };
  const resultado = (r: ResultadoAnual) => hacer(() => filesService.registrarResultado(f.id, r, u), superaLimite(r) ? 'Resultado registrado: el file quedó BLOQUEADO' : 'Resultado registrado');
  const requisito = (c: CodigoRequisito, r: Requisito) => hacer(() => filesService.registrarRequisito(f.id, c, r, u), `${NOMBRE_REQUISITO[c]} registrado`);

  return (
    <>
      <CabeceraFile file={f} acciones={editable && (
        <Button size="sm" variant={f.bloqueado ? 'success' : 'danger'} icon={f.bloqueado ? LockOpen : Lock} onClick={() => setModal('bloqueo')}>
          {f.bloqueado ? 'Desbloquear' : 'Bloquear'}
        </Button>
      )} />
      <Card>
        <Tabs activa={tab} onChange={setTab} className="mb-4" tabs={[
          { id: 'datos', label: 'Datos personales' },
          { id: 'matriculas', label: 'Matrículas', count: f.matriculas.length },
          { id: 'resultados', label: 'Resultados anuales', count: f.resultados.length },
          { id: 'requisitos', label: 'Requisitos' },
          { id: 'tramites', label: 'Trámites', count: tramites.length },
          { id: 'historial', label: 'Historial' },
        ]} />

        {tab === 'datos' && (
          <FormDatosFile key={JSON.stringify(f)} inicial={f} soloLectura={!editable}
            onGuardar={(d) => hacer(() => filesService.editar(f.id, d, u), 'Datos actualizados')} />
        )}
        {tab === 'matriculas' && (
          <>
            {editable && <div className="mb-3 flex justify-end"><Button size="sm" icon={Plus} onClick={() => setModal('matricula')}>Registrar matrícula</Button></div>}
            <TablaMatriculas file={f} />
          </>
        )}
        {tab === 'resultados' && (
          <>
            {editable && <div className="mb-3 flex justify-end"><Button size="sm" icon={Plus} onClick={() => setModal('resultado')}>Registrar resultado</Button></div>}
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
                    <Semaforo color={semaforoRequisito(r)} texto={r.estado === 'COMPLETO' ? 'Completo' : 'Pendiente'} size="sm" />
                  </div>
                  <dl className="mt-2 flex-1 space-y-0.5 text-sm text-slate-600">
                    {r.nivel && <div>Nivel: {r.nivel}</div>}
                    {r.nro && <div>N.º: {r.nro}</div>}
                    {r.fecha && <div>Fecha: {fecha(r.fecha)}</div>}
                    {r.responsable && <div>Recibido por: {r.responsable}</div>}
                    {r.estado === 'PENDIENTE' && <div className="text-amber-700">Aún no registrado</div>}
                  </dl>
                  {editable && (
                    <Button size="sm" variant={r.estado === 'PENDIENTE' ? 'primary' : 'secondary'} className="mt-3" onClick={() => setModal(c)}>
                      {r.estado === 'PENDIENTE' ? ACCION_REQ[c] : 'Actualizar'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {tab === 'tramites' && (
          <DataTable data={tramites} rowKey={(h) => h.nro} vacio="Sin trámites" onRowClick={(h) => nav(`/hojas-ruta/${h.nro}`)} columns={[
            { key: 'nro', header: 'N.º HR', principal: true, render: (h) => <span className="font-medium">{h.nro}</span> },
            { key: 'tipo', header: 'Tipo' },
            { key: 'ingreso', header: 'Ingreso', render: (h) => fecha(h.fechaIngreso) },
            { key: 'estado', header: 'Estado', render: (h) => <EstadoBadge estado={h.estado} /> },
          ]} />
        )}
        {tab === 'historial' && (
          <DataTable data={historial} rowKey={(r) => r.id} vacio="Sin cambios registrados" columns={[
            { key: 'fecha', header: 'Fecha', principal: true, render: (r) => fechaHora(r.fecha) },
            { key: 'usuario', header: 'Usuario' },
            { key: 'accion', header: 'Acción' },
            { key: 'cambio', header: 'Cambio', render: (r) => <code className="text-xs break-all text-slate-500">{JSON.stringify(r.despues)}</code> },
          ]} />
        )}
      </Card>

      {modal === 'matricula' && <ModalMatricula file={f} ocupado={ocupado} onCerrar={() => setModal(null)}
        onGuardar={(anio, gestion) => hacer(() => filesService.registrarMatricula(f.id, { anio, gestion, estado: 'Vigente' }, u), 'Matrícula registrada')} />}
      {modal === 'resultado' && <ModalResultado file={f} ocupado={ocupado} onCerrar={() => setModal(null)} onGuardar={resultado} />}
      {modal === 'bloqueo' && <ModalBloqueo bloquear={!f.bloqueado} ocupado={ocupado} onCerrar={() => setModal(null)}
        onGuardar={(m) => hacer(() => filesService.cambiarBloqueo(f.id, !f.bloqueado, m, u), f.bloqueado ? 'File desbloqueado' : 'File bloqueado')} />}
      {(modal === 'TACFI' || modal === 'TCLO' || modal === 'CERT_NOTAS') && (
        <ModalRequisito codigo={modal} responsable={u.nombre} ocupado={ocupado} onCerrar={() => setModal(null)} onGuardar={(r) => requisito(modal, r)} />
      )}
    </>
  );
}
