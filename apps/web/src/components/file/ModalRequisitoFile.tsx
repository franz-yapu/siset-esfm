import { useState } from 'react';
import type { DatosRequisito, EstadoRequisitoFile, RequisitoDelFile } from '@/types/requisitos';
import { useToast } from '@/hooks';
import {
  erroresDelRequisito,
  ETIQUETA_ESTADO,
  hoyEnLaPaz,
  normalizarRequisito,
  validarRequisito,
  type CampoRequisito,
} from '@/lib/requisitos';
import { Alerta, Button, Input, Modal, Select, Textarea } from '@/components/ui';

interface Props {
  requisito: RequisitoDelFile;
  onCerrar: () => void;
  /** Si lanza un error de la API, se muestra en su campo. */
  onGuardar: (d: DatosRequisito) => Promise<void>;
}

/** Registrar o actualizar un requisito del file (SDD S2.4 §2.4). OBSERVADO: defensa reprobada o no presentada (D-04b). */
export function ModalRequisitoFile({ requisito: r, onCerrar, onGuardar }: Props) {
  const toast = useToast();
  const [d, setD] = useState<DatosRequisito>({
    estado: r.estado === 'PENDIENTE' && !r.registradoPor ? 'COMPLETO' : r.estado,
    fecha: r.fecha ?? '',
    nroDocumento: r.nroDocumento ?? '',
    observacion: r.observacion ?? '',
  });
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [deApi, setDeApi] = useState<{ campos: Partial<Record<CampoRequisito, string>>; general: string | null }>({
    campos: {},
    general: null,
  });
  const errores = { ...(enviado ? validarRequisito(normalizarRequisito(d)) : {}), ...deApi.campos };
  const set = (p: Partial<DatosRequisito>) => setD({ ...d, ...p });

  const guardar = async () => {
    setEnviado(true);
    const datos = normalizarRequisito(d);
    if (Object.keys(validarRequisito(datos)).length) return;
    setGuardando(true);
    try {
      await onGuardar(datos);
      toast.success(`${r.nombre} registrado`);
    } catch (e) {
      setDeApi(erroresDelRequisito(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCerrar}
      title={r.nombre}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {deApi.general && <Alerta tipo="error">{deApi.general}</Alerta>}
        <Select
          label="Estado"
          value={d.estado}
          onChange={(e) => set({ estado: e.target.value as EstadoRequisitoFile })}
          error={errores.estado}
        >
          {(['COMPLETO', 'OBSERVADO', 'PENDIENTE'] as const).map((s) => (
            <option key={s} value={s}>
              {ETIQUETA_ESTADO[s]}
            </option>
          ))}
        </Select>
        <Input
          label="Fecha"
          type="date"
          max={hoyEnLaPaz()}
          value={d.fecha ?? ''}
          onChange={(e) => set({ fecha: e.target.value })}
          error={errores.fecha}
          hint="Del documento o de su recepción."
        />
        <Input
          label="N.º de documento"
          value={d.nroDocumento ?? ''}
          onChange={(e) => set({ nroDocumento: e.target.value })}
          error={errores.nroDocumento}
        />
        <Textarea
          label="Observación"
          value={d.observacion ?? ''}
          onChange={(e) => set({ observacion: e.target.value })}
          error={errores.observacion}
          hint={d.estado === 'OBSERVADO' ? 'Por ejemplo: defensa reprobada o no presentada; se reprograma.' : undefined}
        />
      </div>
    </Modal>
  );
}
