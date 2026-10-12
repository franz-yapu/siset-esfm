import { useEffect, useState } from 'react';
import { Eye, Printer, RotateCcw } from 'lucide-react';
import type { FileAcademico, HojaRutaConTitular, TipoDocumento } from '@/types';
import { useAccion, useAsync, useUsuario } from '@/hooks';
import { documentosService, NOMBRE_DOCUMENTO } from '@/services/documentos.service';
import { filesService } from '@/services/files.service';
import { fecha, fechaHora } from '@/lib/formato';
import { Badge, Button, Card, Cargando, DataTable, Input, Modal, PageHeader, Select, Tabs, Textarea } from '@/components/ui';
import { Documento, ZonaImpresion } from '@/pages/documentos/Plantillas';

interface Previa { h: HojaRutaConTitular; f: FileAcademico; tipo: TipoDocumento }
interface Reimpresion { docId: number; nro: string; tipo: TipoDocumento }

/** P-44 · Emisión de documentos (KARDEX). */
export function Emision() {
  const [tab, setTab] = useState('por-emitir');
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [reimp, setReimp] = useState<Reimpresion | null>(null);
  const [imprimir, setImprimir] = useState<{ tipo: TipoDocumento; f: FileAcademico } | null>(null);
  const { data, loading, reload } = useAsync(() => Promise.all([documentosService.porEmitir(), documentosService.emitidos()]), []);

  // Al tener un documento listo, abre el diálogo de impresión del navegador.
  useEffect(() => {
    if (!imprimir) return;
    const fin = () => setImprimir(null);
    window.addEventListener('afterprint', fin);
    const t = setTimeout(() => window.print(), 300);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', fin); };
  }, [imprimir]);

  if (loading && !data) return <Cargando />;
  if (!data) return null;
  const [porEmitir, emitidos] = data;

  const abrirPrevia = async (h: HojaRutaConTitular) => setPrevia({ h, f: await filesService.obtener(h.fileId), tipo: documentosService.tipoPara(h.tipo) });

  return (
    <>
      <PageHeader titulo="Emisión de documentos" subtitulo="Solo se emiten trámites con dictamen aprobado y file sin bloqueo." />
      <Card>
        <Tabs activa={tab} onChange={setTab} className="mb-4" tabs={[
          { id: 'por-emitir', label: 'Por emitir', count: porEmitir.length },
          { id: 'emitidos', label: 'Emitidos', count: emitidos.length },
        ]} />
        {tab === 'por-emitir' ? (
          <DataTable data={porEmitir} rowKey={(h) => h.nro} vacio="No hay documentos por emitir" columns={[
            { key: 'nro', header: 'N.º HR', principal: true, render: (h) => <span className="font-medium">{h.nro}</span> },
            { key: 'titular', header: 'Titular' },
            { key: 'tipo', header: 'Tipo de documento', render: (h) => NOMBRE_DOCUMENTO[documentosService.tipoPara(h.tipo)] },
            { key: 'fecha', header: 'Fecha de dictamen', render: (h) => fecha(h.fechaDictamen) },
            { key: 'accion', header: '', render: (h) => <Button size="sm" icon={Eye} onClick={() => abrirPrevia(h)}>Vista previa</Button> },
          ]} />
        ) : (
          <DataTable data={emitidos} rowKey={(d) => d.id} searchable vacio="Aún no hay documentos emitidos" columns={[
            { key: 'valorado', header: 'N.º valorado', principal: true, render: (d) => <span className="font-medium">{d.nroValorado}</span> },
            { key: 'nro', header: 'N.º HR' },
            { key: 'titular', header: 'Titular' },
            { key: 'tipo', header: 'Documento', render: (d) => <>{NOMBRE_DOCUMENTO[d.tipo]}{d.esReimpresion && <Badge className="ml-2 bg-amber-50 text-amber-700 ring-amber-300">Reimpresión</Badge>}</> },
            { key: 'fecha', header: 'Fecha', render: (d) => fechaHora(d.fecha) },
            { key: 'usuario', header: 'Usuario' },
            { key: 'accion', header: '', render: (d) => (
              <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setReimp({ docId: d.id, nro: d.nro, tipo: d.tipo })}>Reimprimir</Button>
            ) },
          ]} />
        )}
      </Card>

      {previa && (
        <ModalVistaPrevia previa={previa} onCambiarTipo={(tipo) => setPrevia({ ...previa, tipo })} onCerrar={() => setPrevia(null)}
          onEmitido={() => { setImprimir({ tipo: previa.tipo, f: previa.f }); setPrevia(null); reload(); }} />
      )}
      {reimp && (
        <ModalReimprimir reimp={reimp} onCerrar={() => setReimp(null)}
          onListo={(f) => { setImprimir({ tipo: reimp.tipo, f }); setReimp(null); reload(); }} />
      )}
      {imprimir && <ZonaImpresion><Documento tipo={imprimir.tipo} file={imprimir.f} /></ZonaImpresion>}
    </>
  );
}

function ModalVistaPrevia({ previa, onCambiarTipo, onCerrar, onEmitido }: {
  previa: Previa; onCambiarTipo: (t: TipoDocumento) => void; onCerrar: () => void; onEmitido: () => void;
}) {
  const u = useUsuario();
  const { ejecutar, ocupado } = useAccion();
  const [valorado, setValorado] = useState('');
  const [enviado, setEnviado] = useState(false);
  const emitir = async () => {
    setEnviado(true);
    if (!valorado.trim()) return;
    if (await ejecutar(() => documentosService.emitir(previa.h.nro, previa.tipo, valorado, u), `Documento emitido con valorado ${valorado.trim()}`)) onEmitido();
  };
  return (
    <Modal open size="xl" onClose={onCerrar} title={`Vista previa · ${previa.h.nro} · ${previa.h.titular}`}
      footer={<div className="flex w-full flex-wrap items-end justify-end gap-2">
        <Input label="N.º de valorado" value={valorado} onChange={(e) => setValorado(e.target.value)} error={enviado && !valorado.trim() ? 'Obligatorio' : null} className="w-44" />
        <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
        <Button icon={Printer} loading={ocupado} onClick={emitir}>Emitir e imprimir</Button>
      </div>}>
      <Select label="Documento" value={previa.tipo} onChange={(e) => onCambiarTipo(e.target.value as TipoDocumento)} className="mb-4 max-w-xs">
        {(Object.keys(NOMBRE_DOCUMENTO) as TipoDocumento[]).map((t) => <option key={t} value={t}>{NOMBRE_DOCUMENTO[t]}</option>)}
      </Select>
      <div className="rounded-lg bg-slate-100 p-3 sm:p-6"><Documento tipo={previa.tipo} file={previa.f} vistaPrevia /></div>
    </Modal>
  );
}

function ModalReimprimir({ reimp, onCerrar, onListo }: { reimp: Reimpresion; onCerrar: () => void; onListo: (f: FileAcademico) => void }) {
  const u = useUsuario();
  const { ejecutar, ocupado } = useAccion();
  const [motivo, setMotivo] = useState('');
  const [valorado, setValorado] = useState('');
  const [enviado, setEnviado] = useState(false);
  const confirmar = async () => {
    setEnviado(true);
    if (!motivo.trim() || !valorado.trim()) return;
    let file: FileAcademico | null = null;
    const ok = await ejecutar(async () => {
      await documentosService.reimprimir(reimp.docId, valorado, motivo, u);
      file = await documentosService.fileDe(reimp.nro);
    }, 'Reimpresión registrada');
    if (ok && file) onListo(file);
  };
  return (
    <Modal open size="sm" onClose={onCerrar} title={`Reimprimir · ${reimp.nro}`}
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button><Button icon={Printer} loading={ocupado} onClick={confirmar}>Reimprimir</Button></>}>
      <div className="space-y-4">
        <Textarea label="Motivo de la reimpresión" value={motivo} onChange={(e) => setMotivo(e.target.value)} error={enviado && !motivo.trim() ? 'El motivo es obligatorio' : null} />
        <Input label="N.º del nuevo valorado" value={valorado} onChange={(e) => setValorado(e.target.value)} error={enviado && !valorado.trim() ? 'Obligatorio' : null} />
      </div>
    </Modal>
  );
}
