import { useState } from 'react';
import type { DatosRequisito, EstadoRequisitoFile, RegistroDeGestion, RequisitoDelFile } from '@/types/requisitos';
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
  /** En un requisito por gestión: la que se edita, o null para agregar una nueva (DEC-051). */
  gestion?: RegistroDeGestion | null;
  onCerrar: () => void;
  /** Si lanza un error de la API, se muestra en su campo. */
  onGuardar: (d: DatosRequisito) => Promise<void>;
}

/**
 * Registrar o actualizar un requisito del file (SDD S2.4 §2.4, DEC-051). OBSERVADO: defensa reprobada o no
 * presentada (D-04b). Los TACFI piden el curso y la entidad emisora; los por gestión, la gestión.
 */
export function ModalRequisitoFile({ requisito: r, gestion = null, onCerrar, onGuardar }: Props) {
  const toast = useToast();
  const base = r.porGestion ? gestion : r;
  const nuevo = r.porGestion ? !gestion : r.estado === 'PENDIENTE' && !r.registradoPor;
  const [d, setD] = useState<DatosRequisito>({
    estado: nuevo ? 'COMPLETO' : (base?.estado ?? 'COMPLETO'),
    fecha: base?.fecha ?? '',
    nroDocumento: base?.nroDocumento ?? '',
    observacion: base?.observacion ?? '',
    gestion: r.porGestion ? (gestion?.gestion ?? '') : null,
    nombreCurso: r.pideCurso ? (r.nombreCurso ?? '') : null,
    entidadEmisora: r.pideCurso ? (r.entidadEmisora ?? '') : null,
  });
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [deApi, setDeApi] = useState<{ campos: Partial<Record<CampoRequisito, string>>; general: string | null }>({
    campos: {},
    general: null,
  });
  const errores = { ...(enviado ? validarRequisito(normalizarRequisito(d), r) : {}), ...deApi.campos };
  const set = (p: Partial<DatosRequisito>) => setD({ ...d, ...p });

  const guardar = async () => {
    setEnviado(true);
    const datos = normalizarRequisito(d);
    if (Object.keys(validarRequisito(datos, r)).length) return;
    setGuardando(true);
    try {
      await onGuardar(datos);
      toast.success(`${r.nombre}${datos.gestion ? ` ${datos.gestion}` : ''} registrado`);
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
      title={r.porGestion ? `${r.nombre}${gestion ? ` ${gestion.gestion}` : ': nueva gestión'}` : r.nombre}
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
        {r.porGestion && (
          <Input
            label="Gestión"
            value={d.gestion ?? ''}
            disabled={Boolean(gestion)}
            placeholder="II/2025"
            onChange={(e) => set({ gestion: e.target.value.toUpperCase() })}
            error={errores.gestion}
            hint="Semestral (I/2025, II/2025) o anual (2023)."
          />
        )}
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
        {r.pideCurso && (
          <>
            <Input
              label="Nombre del curso"
              value={d.nombreCurso ?? ''}
              maxLength={150}
              onChange={(e) => set({ nombreCurso: e.target.value })}
              error={errores.nombreCurso}
            />
            <Input
              label="Entidad emisora"
              value={d.entidadEmisora ?? ''}
              maxLength={150}
              onChange={(e) => set({ entidadEmisora: e.target.value })}
              error={errores.entidadEmisora}
            />
          </>
        )}
        <Input
          label={r.pideCurso ? 'Fecha en que lo tomó' : 'Fecha'}
          type="date"
          max={hoyEnLaPaz()}
          value={d.fecha ?? ''}
          onChange={(e) => set({ fecha: e.target.value })}
          error={errores.fecha}
          hint={r.pideCurso ? 'La del certificado del TACFI.' : 'Del documento o de su recepción.'}
        />
        <Input
          label="N.º de documento"
          value={d.nroDocumento ?? ''}
          onChange={(e) => set({ nroDocumento: e.target.value })}
          error={errores.nroDocumento}
          hint={r.porGestion ? 'Por ejemplo, el N.º del valorado.' : undefined}
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
