import type { ReactNode } from 'react';
import { Button, Modal } from '@/components/ui';

interface Props {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  onCerrar: () => void;
  onConfirmar: () => void;
  cargando?: boolean;
  textoConfirmar?: string;
  peligro?: boolean;
  /** Falta un dato obligatorio: el botón de confirmar no se puede pulsar. */
  deshabilitado?: boolean;
}

/** Modal de confirmación genérico ("Cancelar" / "Confirmar"). */
export function Confirmar({
  abierto,
  titulo,
  children,
  onCerrar,
  onConfirmar,
  cargando,
  textoConfirmar = 'Confirmar',
  peligro,
  deshabilitado,
}: Props) {
  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title={titulo}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant={peligro ? 'danger' : 'primary'}
            loading={cargando}
            disabled={deshabilitado}
            onClick={onConfirmar}
            data-autofocus
          >
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="text-sm text-suave">{children}</div>
    </Modal>
  );
}
