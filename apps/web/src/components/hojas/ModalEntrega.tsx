import { useState } from 'react';
import { Alerta, Button, Input, Modal, Select } from '@/components/ui';
import { hoy } from '@/lib/formato';
import { PARENTESCOS } from '@/lib/entrega';
import type { Entrega, Parentesco } from '@/types';

interface Props {
  abierto: boolean;
  nro: string;
  ciTitular: string;
  onCerrar: () => void;
  onConfirmar: (e: Entrega) => Promise<void>;
}

/**
 * Registrar entrega (P-34): al titular o a un familiar de hasta primer grado de consanguinidad o afinidad, previa
 * verificación y con firma de recojo (D-42). CI de quien recibe y fecha.
 */
export function ModalEntrega({ abierto, nro, ciTitular, onCerrar, onConfirmar }: Props) {
  const [a, setA] = useState<Entrega['entregadoA']>('Titular');
  const [ci, setCi] = useState(ciTitular);
  const [nombre, setNombre] = useState('');
  const [parentesco, setParentesco] = useState<Parentesco | ''>('');
  const [verificado, setVerificado] = useState(false);
  const [dia, setDia] = useState(hoy());
  const [cargando, setCargando] = useState(false);
  const familiar = a === 'Familiar';
  const errores = {
    ci: ci.trim() ? null : 'Obligatorio',
    parentesco: familiar && !parentesco ? 'Elija el parentesco' : null,
    nombre: familiar && !nombre.trim() ? 'Obligatorio' : null,
    verificado: familiar && !verificado,
  };
  const invalido = Boolean(errores.ci || errores.parentesco || errores.nombre || errores.verificado);

  const confirmar = async () => {
    if (invalido) return;
    setCargando(true);
    try {
      await onConfirmar({
        entregadoA: a,
        ciReceptor: ci,
        fecha: `${dia}T${new Date().toTimeString().slice(0, 5)}`,
        ...(familiar ? { nombreReceptor: nombre, parentesco: parentesco as Parentesco } : {}),
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title={`Registrar entrega · ${nro}`}
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="success" loading={cargando} disabled={invalido} onClick={confirmar}>
            Registrar entrega
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Entregado a"
          value={a}
          onChange={(e) => {
            const v = e.target.value as Entrega['entregadoA'];
            setA(v);
            setCi(v === 'Titular' ? ciTitular : '');
          }}
        >
          <option value="Titular">Titular</option>
          <option value="Familiar">Familiar (hasta primer grado)</option>
        </Select>
        {familiar && (
          <>
            <Alerta tipo="info">
              Solo un familiar de hasta primer grado de consanguinidad o afinidad, previa verificación y con firma de
              recojo.
            </Alerta>
            <Select
              label="Parentesco"
              value={parentesco}
              onChange={(e) => setParentesco(e.target.value as Parentesco | '')}
              error={errores.parentesco}
            >
              <option value="">Elija…</option>
              {PARENTESCOS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Input
              label="Nombre de quien recibe"
              value={nombre}
              maxLength={100}
              onChange={(e) => setNombre(e.target.value)}
              error={errores.nombre}
            />
          </>
        )}
        <Input
          label="CI de quien recibe"
          value={ci}
          onChange={(e) => setCi(e.target.value)}
          error={errores.ci}
          inputMode="numeric"
        />
        <Input label="Fecha" type="date" value={dia} onChange={(e) => setDia(e.target.value)} max={hoy()} />
        {familiar && (
          <label className="flex items-start gap-2 text-sm text-tinta">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={verificado}
              onChange={(e) => setVerificado(e.target.checked)}
            />
            Verifiqué el parentesco y firmó el recojo.
          </label>
        )}
      </div>
    </Modal>
  );
}
