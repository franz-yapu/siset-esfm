import { LogOut } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

/** Aviso antes del cierre por inactividad (RNF-02, SDD S1.10 §2.4). Cerrarlo cuenta como actividad. */
export function AvisoInactividad({
  segundos,
  onSeguir,
  onCerrar,
}: {
  segundos: number | null;
  onSeguir: () => void;
  onCerrar: () => void;
}) {
  return (
    <Modal
      open={segundos !== null}
      title="¿Sigues ahí?"
      size="sm"
      onClose={onSeguir}
      footer={
        <>
          <Button variant="secondary" icon={LogOut} onClick={onCerrar}>
            Cerrar sesión
          </Button>
          <Button onClick={onSeguir}>Seguir conectado</Button>
        </>
      }
    >
      <p className="text-sm text-slate-700" aria-live="polite">
        Por seguridad, tu sesión se cerrará en <strong>{segundos ?? 0} s</strong> por inactividad.
      </p>
    </Modal>
  );
}
