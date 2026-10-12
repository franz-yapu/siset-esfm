import { useState } from 'react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { hoy } from '@/lib/formato';
import type { Entrega } from '@/types';

interface Props { abierto: boolean; nro: string; ciTitular: string; onCerrar: () => void; onConfirmar: (e: Entrega) => Promise<void> }

/** Registrar entrega (P-34): a quién, CI de quien recibe y fecha. */
export function ModalEntrega({ abierto, nro, ciTitular, onCerrar, onConfirmar }: Props) {
  const [a, setA] = useState<Entrega['entregadoA']>('Titular');
  const [ci, setCi] = useState(ciTitular);
  const [dia, setDia] = useState(hoy());
  const [cargando, setCargando] = useState(false);
  const error = ci.trim() ? null : 'Obligatorio';

  const confirmar = async () => {
    if (error) return;
    setCargando(true);
    try { await onConfirmar({ entregadoA: a, ciReceptor: ci, fecha: `${dia}T${new Date().toTimeString().slice(0, 5)}` }); } finally { setCargando(false); }
  };

  return (
    <Modal open={abierto} onClose={onCerrar} title={`Registrar entrega · ${nro}`}
      footer={<><Button variant="secondary" onClick={onCerrar}>Cancelar</Button><Button variant="success" loading={cargando} disabled={Boolean(error)} onClick={confirmar}>Registrar entrega</Button></>}>
      <div className="space-y-4">
        <Select label="Entregado a" value={a} onChange={(e) => { const v = e.target.value as Entrega['entregadoA']; setA(v); setCi(v === 'Titular' ? ciTitular : ''); }}>
          <option>Titular</option><option>Apoderado</option>
        </Select>
        <Input label="CI de quien recibe" value={ci} onChange={(e) => setCi(e.target.value)} error={error} inputMode="numeric" />
        <Input label="Fecha" type="date" value={dia} onChange={(e) => setDia(e.target.value)} max={hoy()} />
      </div>
    </Modal>
  );
}
