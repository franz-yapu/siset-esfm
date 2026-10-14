import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Alerta, Button, Modal } from '@/components/ui';

interface Props {
  /** CI / usuario con el que entra la persona. */
  usuario: string;
  nombre: string;
  passwordTemporal: string;
  /** Al cerrar, quien lo abrió descarta la contraseña (estado y `mutation.reset()`). */
  onCerrar: () => void;
}

/**
 * Muestra la contraseña temporal UNA sola vez (DEC-020 #2, SDD S1.13 §2.4).
 * Solo se cierra con el botón: ni Esc ni clic afuera, para no perderla por accidente.
 * No se guarda en ningún lado ni se escribe en la consola.
 */
export function ModalPasswordTemporal({ usuario, nombre, passwordTemporal, onCerrar }: Props) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(passwordTemporal);
      setCopiada(true);
    } catch {
      setCopiada(false); // sin permiso del navegador: el texto queda seleccionable
    }
  };
  return (
    <Modal
      open
      cerrable={false}
      onClose={onCerrar}
      title="Contraseña temporal"
      size="sm"
      footer={
        <Button onClick={onCerrar} data-autofocus>
          Ya la anoté
        </Button>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        <p>
          Entregue estos datos a <strong>{nombre}</strong>.
        </p>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
          <dt className="text-slate-500">Usuario</dt>
          <dd>
            <code className="font-mono">{usuario}</code>
          </dd>
          <dt className="text-slate-500">Contraseña</dt>
          <dd className="flex items-center gap-2">
            <code
              className="rounded bg-slate-100 px-2 py-1 font-mono text-base tracking-wider select-all"
              data-testid="password-temporal"
            >
              {passwordTemporal}
            </code>
            <Button size="sm" variant="ghost" icon={Copy} onClick={copiar} aria-label="Copiar contraseña">
              {copiada ? 'Copiada' : 'Copiar'}
            </Button>
          </dd>
        </dl>
        <Alerta tipo="aviso">
          Anótela y entréguela a la persona. No se volverá a mostrar. Deberá cambiarla en su primer ingreso.
        </Alerta>
      </div>
    </Modal>
  );
}
