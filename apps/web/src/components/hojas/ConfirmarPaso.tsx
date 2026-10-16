import type { AccionPosible } from '@/types/hojas-ruta';
import { PIDEN_OBSERVACION } from '@/lib/maquina-hojas-ruta';
import { Alerta, Textarea } from '@/components/ui';
import { Confirmar } from './Confirmar';

interface Props {
  paso: AccionPosible | null;
  nro: string;
  titular: string;
  nroValorado: string | null;
  obs: string;
  onObs: (v: string) => void;
  cargando: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
}

/**
 * Confirmación de un paso del trámite (todos menos la entrega). En el historial y la legalización (DEC-053), Kardex
 * contrasta las notas con los empastes: si están bien, imprime y queda anotado el valorado; si no, devuelve con una
 * observación obligatoria y el trámite termina en SISET.
 */
export function ConfirmarPaso({ paso, nro, titular, nroValorado, obs, onObs, cargando, onCerrar, onConfirmar }: Props) {
  const devolver = paso !== null && PIDEN_OBSERVACION.includes(paso.accion);
  const imprimeValorado = paso?.accion === 'IMPRIMIR' && nroValorado !== null;
  return (
    <Confirmar
      abierto={paso !== null}
      titulo={paso?.etiqueta ?? ''}
      cargando={cargando}
      peligro={devolver}
      textoConfirmar={devolver ? 'Devolver' : 'Confirmar'}
      deshabilitado={devolver && !obs.trim()}
      onCerrar={onCerrar}
      onConfirmar={onConfirmar}
    >
      {devolver ? (
        <Alerta tipo="aviso" titulo="No se imprime">
          Las notas del sistema no coinciden con los empastes. El trámite {nro} de {titular} termina aquí: el egresado
          tiene que hacer otro trámite, fuera de SISET.
        </Alerta>
      ) : (
        <p>
          ¿Confirmas <strong>{paso?.etiqueta.toLowerCase()}</strong> para el trámite {nro} de {titular}? Quedará
          registrado en el historial y en la bitácora.
        </p>
      )}
      {imprimeValorado && (
        <p className="mt-2">
          Antes de imprimir, contrasta las notas del sistema con los empastes. Quedará anotado:{' '}
          <strong>Impreso en el valorado N.º {nroValorado}</strong>.
        </p>
      )}
      <Textarea
        className="mt-3"
        label={devolver ? 'Observación (obligatoria): qué no coincide' : 'Observación (opcional)'}
        value={obs}
        maxLength={255}
        onChange={(e) => onObs(e.target.value)}
      />
    </Confirmar>
  );
}
