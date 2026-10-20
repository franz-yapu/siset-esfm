import { useState } from 'react';
import clsx from 'clsx';
import { FileText, Lock, LockOpen } from 'lucide-react';
import type { CausaBloqueo, DatosBloqueo, FileDetalle } from '@/types/files';
import { useToast, useUsuario } from '@/hooks';
import { useBloqueo, useMutacionFiles } from '@/hooks/useFiles';
import { filesService } from '@/services/files.service';
import { erroresDeFormulario } from '@/lib/formularios';
import { fecha, fechaHora } from '@/lib/formato';
import { Alerta, Button, Input, Modal, Select, Textarea } from '@/components/ui';

/** Las dos causas que nombró la escuela (D-29, DEC-049): en ambas se espera que el estudiante se reincorpore. */
export const CAUSAS_BLOQUEO: { valor: CausaBloqueo; texto: string }[] = [
  { valor: 'LICENCIA_OBLIGATORIA', texto: 'Licencia temporal obligatoria' },
  { valor: 'LICENCIA_VOLUNTARIA', texto: 'Licencia temporal voluntaria' },
];

export const textoCausa = (c: CausaBloqueo) => CAUSAS_BLOQUEO.find((x) => x.valor === c)?.texto ?? c;

/** Como el CHECK de la API (`ck_bloqueo_pdf`). */
const PDF_MAX_BYTES = 5 * 1024 * 1024;
const hoyLaPaz = () => new Date(Date.now() - 4 * 60 * 60_000).toISOString().slice(0, 10);

const CAMPOS = ['causa', 'nroResolucion', 'fechaResolucion', 'glosa', 'pdf'] as const;
type Campo = (typeof CAMPOS)[number];
type Errores = Partial<Record<Campo, string>>;

interface Formulario {
  causa: CausaBloqueo | '';
  nroResolucion: string;
  fechaResolucion: string;
  glosa: string;
  pdf: File | null;
}

const VACIO: Formulario = { causa: '', nroResolucion: '', fechaResolucion: '', glosa: '', pdf: null };

function validarLocal(f: Formulario): Errores {
  const e: Errores = {};
  if (!f.causa) e.causa = 'Elija la causa del bloqueo';
  if (!f.nroResolucion.trim()) e.nroResolucion = 'Escriba el número de la resolución';
  if (!f.fechaResolucion) e.fechaResolucion = 'Indique la fecha de la resolución';
  else if (f.fechaResolucion > hoyLaPaz()) e.fechaResolucion = 'La fecha de la resolución no puede ser futura';
  if (f.glosa.trim().length < 5) e.glosa = 'Escriba la glosa con el motivo';
  if (!f.pdf) e.pdf = 'Adjunte el PDF de la resolución';
  else if (f.pdf.type !== 'application/pdf' && !/\.pdf$/i.test(f.pdf.name)) e.pdf = 'El archivo no es un PDF';
  else if (f.pdf.size > PDF_MAX_BYTES) e.pdf = 'El PDF pesa más de 5 MB';
  return e;
}

/** Abre el PDF de la resolución en otra pestaña (la descarga lleva el token, por eso no es un enlace directo). */
function BotonVerPdf({ fileId }: { fileId: number }) {
  const toast = useToast();
  const [cargando, setCargando] = useState(false);
  const ver = async () => {
    // La pestaña se abre antes de esperar la descarga: si no, el navegador la toma por una ventana emergente.
    const pestana = window.open('', '_blank');
    setCargando(true);
    try {
      const url = URL.createObjectURL(await filesService.pdfBloqueo(fileId));
      if (pestana) pestana.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      pestana?.close();
      toast.error('No se pudo abrir el PDF de la resolución');
    } finally {
      setCargando(false);
    }
  };
  return (
    <Button size="sm" variant="secondary" icon={FileText} loading={cargando} onClick={ver}>
      Ver PDF de la resolución
    </Button>
  );
}

/**
 * La resolución del bloqueo abierto. Los files bloqueados antes de DEC-049 no la tienen: se muestra el motivo,
 * salvo con `sinMotivo` (la cabecera del file ya lo muestra).
 */
export function ResolucionBloqueo({
  file,
  sinMotivo = false,
  className,
}: {
  file: FileDetalle;
  sinMotivo?: boolean;
  className?: string;
}) {
  const { data: b, isLoading } = useBloqueo(file.id, file.bloqueado);
  if (!file.bloqueado || isLoading) return null;
  if (!b) {
    return file.motivoBloqueo && !sinMotivo ? <Alerta tipo="aviso">Bloqueado por: {file.motivoBloqueo}</Alerta> : null;
  }
  return (
    <div className={clsx('space-y-2 rounded-[10px] border border-borde bg-white p-3 text-sm', className)}>
      <p className="font-medium text-tinta">Resolución del bloqueo</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-suave">Causa</dt>
        <dd>{textoCausa(b.causa)}</dd>
        <dt className="text-suave">Resolución</dt>
        <dd>
          {b.nroResolucion}, del {fecha(b.fechaResolucion)}
        </dd>
        <dt className="text-suave">Glosa</dt>
        <dd>{b.glosa}</dd>
        {b.bloqueadoPor && (
          <>
            <dt className="text-suave">Bloqueó</dt>
            <dd>
              {b.bloqueadoPor.nombre}, {fechaHora(b.bloqueadoEn)}
            </dd>
          </>
        )}
      </dl>
      <BotonVerPdf fileId={file.id} />
    </div>
  );
}

/**
 * Bloquear o desbloquear el file (D-29, DEC-049). Bloquear pide la causa, el número, la fecha y la glosa de la
 * resolución y su PDF; desbloquear muestra la resolución y solo pide confirmar. Solo con el permiso `editar-file`.
 */
export function BloqueoFile({ file }: { file: FileDetalle }) {
  const u = useUsuario();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [general, setGeneral] = useState<string | null>(null);
  const bloquear = !file.bloqueado;
  const accion = useMutacionFiles((d: DatosBloqueo | null) =>
    d ? filesService.bloquear(file.id, d, u) : filesService.desbloquear(file.id, u),
  );

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const cerrar = () => {
    setAbierto(false);
    setForm(VACIO);
    setErrores({});
    setGeneral(null);
  };

  const guardar = async () => {
    setGeneral(null);
    let datos: DatosBloqueo | null = null;
    if (bloquear) {
      const locales = validarLocal(form);
      if (Object.keys(locales).length) return setErrores(locales);
      datos = {
        causa: form.causa as CausaBloqueo,
        nroResolucion: form.nroResolucion.trim(),
        fechaResolucion: form.fechaResolucion,
        glosa: form.glosa.trim(),
        pdf: form.pdf!,
      };
    }
    try {
      await accion.mutateAsync(datos);
      toast.success(bloquear ? 'File bloqueado' : 'File desbloqueado');
      cerrar();
    } catch (e) {
      const r = erroresDeFormulario(e, CAMPOS);
      setErrores(r.campos);
      setGeneral(r.general);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant={bloquear ? 'danger-outline' : 'secondary'}
        icon={bloquear ? Lock : LockOpen}
        onClick={() => setAbierto(true)}
      >
        {bloquear ? 'Bloquear' : 'Desbloquear'}
      </Button>
      {abierto && (
        <Modal
          open
          onClose={cerrar}
          title={bloquear ? 'Bloquear file' : 'Desbloquear file'}
          size={bloquear ? 'md' : 'sm'}
          footer={
            <>
              <Button variant="secondary" onClick={cerrar}>
                Cancelar
              </Button>
              <Button variant={bloquear ? 'danger' : 'success'} loading={accion.isPending} onClick={guardar}>
                {bloquear ? 'Bloquear' : 'Desbloquear'}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            {general && <Alerta tipo="error">{general}</Alerta>}
            {bloquear ? (
              <>
                <Select
                  label="Causa"
                  value={form.causa}
                  onChange={(e) => cambiar('causa', e.target.value as CausaBloqueo | '')}
                  error={errores.causa}
                >
                  <option value="">Elija la causa…</option>
                  {CAUSAS_BLOQUEO.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.texto}
                    </option>
                  ))}
                </Select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Número de resolución"
                    value={form.nroResolucion}
                    maxLength={100}
                    onChange={(e) => cambiar('nroResolucion', e.target.value)}
                    error={errores.nroResolucion}
                  />
                  <Input
                    label="Fecha de la resolución"
                    type="date"
                    max={hoyLaPaz()}
                    value={form.fechaResolucion}
                    onChange={(e) => cambiar('fechaResolucion', e.target.value)}
                    error={errores.fechaResolucion}
                  />
                </div>
                <Textarea
                  label="Glosa"
                  value={form.glosa}
                  maxLength={255}
                  onChange={(e) => cambiar('glosa', e.target.value)}
                  error={errores.glosa}
                  hint="El motivo del bloqueo. Lo ven Secretaría y el estudiante."
                />
                <Input
                  label="PDF de la resolución"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => cambiar('pdf', e.target.files?.[0] ?? null)}
                  error={errores.pdf}
                  hint="Hasta 5 MB. Queda guardado con el file y en la bitácora con tu usuario."
                />
              </>
            ) : (
              <>
                <ResolucionBloqueo file={file} />
                <p className="text-sm text-suave">
                  Al desbloquear queda registrado quién lo hizo y cuándo. La resolución queda en el historial.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
