import { describe, expect, it, vi } from 'vitest';
import { AVISO_ANTES_MS, crearVigilante, inactivoDemasiado, LIMITE_INACTIVIDAD_MS } from './inactividad';

const MIN = 60_000;

/** Vigilante con reloj y almacenamiento falsos; `otraPestana` escribe como si fuera otra pestaña. */
function armar() {
  let t = 1_000_000;
  let guardada: number | null = null;
  const escrituras: number[] = [];
  const alAvisar = vi.fn<(s: number) => void>();
  const alReanudar = vi.fn();
  const alVencer = vi.fn();
  const v = crearVigilante({
    ahora: () => t,
    leer: () => guardada,
    escribir: (ms) => {
      guardada = ms;
      escrituras.push(ms);
    },
    alAvisar,
    alReanudar,
    alVencer,
  });
  const inicio = t;
  return {
    v,
    alAvisar,
    alReanudar,
    alVencer,
    escrituras,
    ir: (ms: number) => {
      t = inicio + ms;
      v.revisar();
    },
    mover: (ms: number) => {
      t = inicio + ms;
    },
    otraPestana: (ms: number) => {
      guardada = inicio + ms;
    },
  };
}

describe('crearVigilante (RNF-02, SDD S1.10 §2.4)', () => {
  it('avisa a los 14 min con 60 s y vence a los 15 una sola vez', () => {
    const { ir, alAvisar, alVencer } = armar();
    ir(14 * MIN - 1000);
    expect(alAvisar).not.toHaveBeenCalled();
    ir(14 * MIN);
    expect(alAvisar).toHaveBeenLastCalledWith(60);
    ir(14 * MIN + 30_000);
    expect(alAvisar).toHaveBeenLastCalledWith(30);
    ir(15 * MIN);
    ir(16 * MIN);
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it('la actividad durante el aviso lo cierra y reinicia la cuenta', () => {
    const { v, ir, mover, alReanudar, alVencer } = armar();
    ir(14 * MIN + 30_000);
    mover(14 * MIN + 31_000);
    v.registrarActividad();
    expect(alReanudar).toHaveBeenCalledTimes(1);
    ir(15 * MIN);
    expect(alVencer).not.toHaveBeenCalled();
    ir(14 * MIN + 31_000 + LIMITE_INACTIVIDAD_MS);
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it('escribe la actividad como mucho cada 5 s', () => {
    const { v, mover, escrituras } = armar();
    expect(escrituras).toHaveLength(1); // arrancar cuenta como actividad
    mover(1000);
    v.registrarActividad();
    mover(4999);
    v.registrarActividad();
    expect(escrituras).toHaveLength(1);
    mover(5000);
    v.registrarActividad();
    expect(escrituras).toHaveLength(2);
  });

  it('la actividad de otra pestaña posterga el cierre', () => {
    const { ir, otraPestana, alVencer, alAvisar } = armar();
    otraPestana(10 * MIN);
    ir(15 * MIN);
    expect(alVencer).not.toHaveBeenCalled();
    expect(alAvisar).not.toHaveBeenCalled();
    ir(10 * MIN + LIMITE_INACTIVIDAD_MS);
    expect(alVencer).toHaveBeenCalledTimes(1);
  });

  it('detenido, no avisa ni vence', () => {
    const { v, ir, alAvisar, alVencer } = armar();
    v.detener();
    ir(20 * MIN);
    expect(alAvisar).not.toHaveBeenCalled();
    expect(alVencer).not.toHaveBeenCalled();
  });
});

describe('inactivoDemasiado', () => {
  it('sin registro no; antes del límite no; en el límite sí', () => {
    expect(inactivoDemasiado(null, 10 ** 9)).toBe(false);
    expect(inactivoDemasiado(0 + 1, LIMITE_INACTIVIDAD_MS)).toBe(false);
    expect(inactivoDemasiado(1, 1 + LIMITE_INACTIVIDAD_MS)).toBe(true);
    expect(AVISO_ANTES_MS).toBe(60_000);
  });
});
