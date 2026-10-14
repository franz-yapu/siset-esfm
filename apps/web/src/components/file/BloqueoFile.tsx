import { useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import type { FileDetalle } from '@/types/files';
import { useToast, useUsuario } from '@/hooks';
import { useMutacionFiles } from '@/hooks/useFiles';
import { filesService } from '@/services/files.service';
import { erroresDeFormulario } from '@/lib/formularios';
import { Alerta, Button, Input, Modal, Textarea } from '@/components/ui';

/** Los dos casos que nombró la escuela (D-07b); el motivo sigue siendo texto libre (D-29). */
export const ATAJOS_MOTIVO = [
  'Permiso obligatorio por una gestión, por reprobación',
  'Permiso obligatorio por una gestión: no existe la especialidad para su reincorporación',
] as const;

/**
 * Bloquear o desbloquear el file (SDD S2.6 §2.2, D-07b). Bloquear pide el motivo; desbloquear, el número de
 * la resolución que define la situación del estudiante. Solo se muestra con el permiso `editar-file`.
 */
export function BloqueoFile({ file }: { file: FileDetalle }) {
  const u = useUsuario();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bloquear = !file.bloqueado;
  const campo = bloquear ? 'motivo' : 'resolucion';
  const accion = useMutacionFiles((t: string) =>
    bloquear ? filesService.bloquear(file.id, t, u) : filesService.desbloquear(file.id, t, u),
  );

  const cerrar = () => {
    setAbierto(false);
    setTexto('');
    setError(null);
  };

  const guardar = async () => {
    const t = texto.trim();
    if (bloquear && t.length < 5) return setError('Escriba el motivo del bloqueo');
    if (!bloquear && !t) return setError('Escriba el número de la resolución');
    try {
      await accion.mutateAsync(t);
      toast.success(bloquear ? 'File bloqueado' : 'File desbloqueado');
      cerrar();
    } catch (e) {
      const { campos, general } = erroresDeFormulario(e, [campo]);
      setError(campos[campo] ?? general);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant={bloquear ? 'danger' : 'success'}
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
          size="sm"
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
          {bloquear ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                {ATAJOS_MOTIVO.map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant="secondary"
                    className="justify-start text-left"
                    onClick={() => setTexto(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
              <Textarea
                label="Motivo"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                error={error}
                hint="Quedará registrado en la bitácora con tu usuario."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {file.motivoBloqueo && <Alerta tipo="aviso">Bloqueado por: {file.motivoBloqueo}</Alerta>}
              <Input
                label="Número de resolución"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                error={error}
                hint="La resolución que define la situación del estudiante. Queda en la bitácora."
              />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
