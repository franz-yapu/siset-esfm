import type { Entrega, Parentesco } from '@/types';

/** Hasta primer grado: consanguinidad (padres, hijos) y afinidad (suegros, yerno o nuera) (D-42). */
export const PARENTESCOS: readonly Parentesco[] = ['Padre', 'Madre', 'Hijo/a', 'Suegro/a', 'Yerno/Nuera'];

/**
 * La observación del paso ENTREGAR: a quién se entregó (DEC-046, D-42). Un familiar lleva su parentesco, nombre y CI,
 * y que se verificó el parentesco y firmó el recojo.
 */
export function textoEntrega(e: Omit<Entrega, 'fecha'>): string {
  const ci = e.ciReceptor.trim();
  if (e.entregadoA === 'Titular') return `Entregado a titular (CI ${ci})`;
  return `Entregado a familiar: ${e.parentesco?.toLowerCase()}, ${e.nombreReceptor?.trim()} (CI ${ci}); parentesco verificado y firma de recojo`;
}

export interface EntregaLeida {
  /** "Titular" o el parentesco ("Madre", "Hijo/a"…). */
  calidad: string;
  /** Solo el familiar lo trae en el texto; el del titular sale del trámite. */
  nombre: string | null;
  ci: string;
  /** dd/mm/aaaa cuando la entrega fue otro día (DEC-046). */
  fecha: string | null;
}

/**
 * Lo contrario de `textoEntrega`: la constancia de entrega de la hoja de ruta (observación #8 del tutor, SDD OBS-T1)
 * la vuelve a leer de la observación del paso ENTREGAR. Null si el texto no tiene ese formato.
 */
export function leerEntrega(obs: string | null): EntregaLeida | null {
  if (!obs) return null;
  const [, cuerpo, fecha = null] = /^(.*?)(?: el (\d{2}\/\d{2}\/\d{4}))?$/.exec(obs.trim()) ?? [];
  const titular = /^Entregado a titular \(CI ([^)]+)\)$/.exec(cuerpo ?? '');
  if (titular) return { calidad: 'Titular', nombre: null, ci: titular[1], fecha };
  const familiar = /^Entregado a familiar: ([^,]+), (.+) \(CI ([^)]+)\);/.exec(cuerpo ?? '');
  if (!familiar) return null;
  const parentesco = PARENTESCOS.find((p) => p.toLowerCase() === familiar[1]) ?? familiar[1];
  return { calidad: parentesco, nombre: familiar[2], ci: familiar[3], fecha };
}
