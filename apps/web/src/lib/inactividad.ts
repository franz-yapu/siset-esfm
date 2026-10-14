// Cierre por inactividad (RNF-02, SDD S1.10 §2.4). La hora de la última actividad vive en
// localStorage: no es un secreto y la comparten todas las pestañas, así trabajar en una
// mantiene vivas las otras. Se compara la hora guardada en vez de contar con un setTimeout
// largo, porque el navegador frena los temporizadores de las pestañas en segundo plano.

export const LIMITE_INACTIVIDAD_MS = 15 * 60_000;
export const AVISO_ANTES_MS = 60_000;
export const CLAVE_ACTIVIDAD = 'siset.ultimaActividad';
/** Cada cuánto se escribe la actividad como máximo. */
export const THROTTLE_ACTIVIDAD_MS = 5_000;
/** Cada cuánto se revisa. */
export const INTERVALO_REVISION_MS = 1_000;

/** Lee la última actividad registrada (ms), o null. Nunca lanza. */
export function leerUltimaActividad(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_ACTIVIDAD));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function escribirUltimaActividad(ms: number): void {
  try {
    localStorage.setItem(CLAVE_ACTIVIDAD, String(ms));
  } catch {
    /* sin almacenamiento: el vigilante sigue en memoria */
  }
}

export function borrarUltimaActividad(): void {
  try {
    localStorage.removeItem(CLAVE_ACTIVIDAD);
  } catch {
    /* sin almacenamiento */
  }
}

/** ¿Pasó el límite desde la última actividad? Sin registro, no. */
export const inactivoDemasiado = (ultima: number | null, ahora: number): boolean =>
  ultima !== null && ahora - ultima >= LIMITE_INACTIVIDAD_MS;

export interface OpcionesVigilante {
  ahora: () => number;
  leer: () => number | null;
  escribir: (ms: number) => void;
  /** Faltan `segundos` para el cierre (se llama en cada revisión mientras dura el aviso). */
  alAvisar: (segundos: number) => void;
  /** Hubo actividad durante el aviso. */
  alReanudar: () => void;
  /** Se cumplió el límite. Se llama una sola vez. */
  alVencer: () => void;
}

export interface Vigilante {
  registrarActividad: () => void;
  revisar: () => void;
  detener: () => void;
}

/** Núcleo puro del vigilante: sin DOM ni temporizadores, para probarlo con un reloj falso. */
export function crearVigilante(o: OpcionesVigilante): Vigilante {
  let ultimaEscrita = Number.NEGATIVE_INFINITY;
  let memoria = o.ahora();
  let avisando = false;
  let terminado = false;

  const ultima = () => Math.max(o.leer() ?? memoria, memoria);

  const registrarActividad = () => {
    if (terminado) return;
    const t = o.ahora();
    memoria = t;
    if (t - ultimaEscrita >= THROTTLE_ACTIVIDAD_MS) {
      ultimaEscrita = t;
      o.escribir(t);
    }
    if (avisando) revisar();
  };

  const revisar = () => {
    if (terminado) return;
    const inactivo = o.ahora() - ultima();
    if (inactivo >= LIMITE_INACTIVIDAD_MS) {
      terminado = true;
      o.alVencer();
    } else if (inactivo >= LIMITE_INACTIVIDAD_MS - AVISO_ANTES_MS) {
      avisando = true;
      o.alAvisar(Math.ceil((LIMITE_INACTIVIDAD_MS - inactivo) / 1000));
    } else if (avisando) {
      avisando = false;
      o.alReanudar();
    }
  };

  // Arrancar cuenta como actividad: recién se inició o restauró la sesión.
  registrarActividad();
  return {
    registrarActividad,
    revisar,
    detener: () => {
      terminado = true;
    },
  };
}

const EVENTOS_ACTIVIDAD = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'mousemove'] as const;

/** Engancha el vigilante a los eventos del navegador. Devuelve la función que lo desengancha. */
export function vigilarNavegador(v: Vigilante): () => void {
  const actividad = () => v.registrarActividad();
  const visible = () => {
    if (document.visibilityState === 'visible') v.revisar();
  };
  for (const ev of EVENTOS_ACTIVIDAD) window.addEventListener(ev, actividad, { capture: true, passive: true });
  document.addEventListener('visibilitychange', visible);
  const intervalo = window.setInterval(() => v.revisar(), INTERVALO_REVISION_MS);
  return () => {
    for (const ev of EVENTOS_ACTIVIDAD) window.removeEventListener(ev, actividad, { capture: true });
    document.removeEventListener('visibilitychange', visible);
    window.clearInterval(intervalo);
    v.detener();
  };
}
