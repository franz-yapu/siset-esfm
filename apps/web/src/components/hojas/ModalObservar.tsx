import { useState } from 'react';
import type { FileAcademico } from '@/types';
import { CODIGOS_REQUISITO, NOMBRE_REQUISITO } from '@/lib/reglas';
import { Button, Modal, Textarea } from '@/components/ui';

interface Props {
  abierto: boolean;
  file: FileAcademico;
  onCerrar: () => void;
  onConfirmar: (motivo: string) => Promise<void>;
}

/** Observar un trámite: motivo obligatorio + requisitos faltantes (P-31, P-43). */
export function ModalObservar({ abierto, file, onCerrar, onConfirmar }: Props) {
  const pendientes = CODIGOS_REQUISITO.filter((c) => file.requisitos[c].estado !== 'COMPLETO');
  const [faltan, setFaltan] = useState<string[]>(pendientes.map((c) => NOMBRE_REQUISITO[c]));
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const confirmar = async () => {
    const texto = [faltan.length ? `Falta: ${faltan.join(', ')}` : '', motivo.trim()].filter(Boolean).join('. ');
    if (!texto) {
      setError('Indica el motivo o marca los requisitos faltantes');
      return;
    }
    setCargando(true);
    try {
      await onConfirmar(texto);
    } finally {
      setCargando(false);
    }
  };

  const opciones = [...CODIGOS_REQUISITO.map((c) => NOMBRE_REQUISITO[c]), 'Valorado', 'Fotocopia de CI'];
  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title="Observar trámite"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="danger" loading={cargando} onClick={confirmar}>
            Observar
          </Button>
        </>
      }
    >
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium text-slate-700">Requisitos faltantes</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {opciones.map((o) => (
            <label key={o} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="accent-primario"
                checked={faltan.includes(o)}
                onChange={(e) => setFaltan(e.target.checked ? [...faltan, o] : faltan.filter((x) => x !== o))}
              />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea
        label="Motivo de la observación"
        value={motivo}
        onChange={(e) => {
          setMotivo(e.target.value);
          setError(null);
        }}
        error={error}
        hint="Lo verá el titular en el seguimiento de su trámite."
      />
    </Modal>
  );
}
