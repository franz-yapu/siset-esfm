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
          <Button variant={peligro ? 'danger' : 'primary'} loading={cargando} onClick={onConfirmar} data-autofocus>
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{children}</div>
    </Modal>
  );
}
