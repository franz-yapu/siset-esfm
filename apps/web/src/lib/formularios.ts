import { ErrorApi } from './errores';

// Errores de la API dentro de un formulario (DEC-023 #4, SDD S2.9-S2.10 §2.5). La usan usuarios y files.

/** Errores que se muestran en el formulario: por campo y uno general. */
export interface ErroresDeFormulario<C extends string> {
  campos: Partial<Record<C, string>>;
  general: string | null;
}

/**
 * Traduce un error de la API: `VALIDACION` con `detalles[].ruta` va debajo de cada campo; los códigos de
 * `porCodigo` (p. ej. `USUARIO_EXISTENTE` → `ci`) van al campo que indican; el resto, como aviso general.
 */
export function erroresDeFormulario<C extends string>(
  e: unknown,
  campos: readonly C[],
  porCodigo: Partial<Record<string, C>> = {},
): ErroresDeFormulario<C> {
  const mensaje = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
  if (!(e instanceof ErrorApi)) return { campos: {}, general: mensaje };
  const destino = porCodigo[e.codigo];
  if (destino) return { campos: { [destino]: e.message } as Partial<Record<C, string>>, general: null };
  if (e.codigo !== 'VALIDACION') return { campos: {}, general: mensaje };

  const esCampo = (v: string): v is C => (campos as readonly string[]).includes(v);
  const porCampo: Partial<Record<C, string>> = {};
  const sueltos: string[] = [];
  for (const d of Array.isArray(e.detalles) ? (e.detalles as unknown[]) : []) {
    if (typeof d !== 'object' || d === null) continue;
    const { ruta, mensaje: m } = d as { ruta?: unknown; mensaje?: unknown };
    if (typeof m !== 'string') continue;
    const campo = typeof ruta === 'string' ? (ruta.split('.').at(-1) ?? '') : '';
    if (esCampo(campo)) porCampo[campo] ??= m;
    else sueltos.push(m);
  }
  const general = sueltos.length ? sueltos.join(' ') : Object.keys(porCampo).length ? null : mensaje;
  return { campos: porCampo, general };
}
