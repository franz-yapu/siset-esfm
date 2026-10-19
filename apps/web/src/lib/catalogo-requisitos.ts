import type { Modalidad } from '@/types/files';
import type { RequisitoAdmin } from '@/types/catalogo-requisitos';

// Reglas del catálogo de requisitos (DEC-055). `codigoDesdeNombre` repite la de la API
// (apps/api/src/modulos/catalogos/requisitos-admin.servicio.ts) para la demo.

/** Código a partir del nombre: mayúsculas sin tildes, con sufijo si ya existe (máx. 30). */
export function codigoDesdeNombre(nombre: string, existentes: readonly string[]): string {
  const base =
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 26)
      .replace(/_+$/, '') || 'REQUISITO';
  if (!existentes.includes(base)) return base;
  for (let i = 2; ; i++) if (!existentes.includes(`${base}_${i}`)) return `${base}_${i}`;
}

export function validarRequisitoCatalogo(d: { nombre: string }): Partial<Record<'nombre', string>> {
  const n = d.nombre.trim();
  if (n.length < 3) return { nombre: 'El nombre necesita al menos 3 caracteres' };
  if (n.length > 120) return { nombre: 'Máximo 120 caracteres' };
  return {};
}

/** Si el requisito se pide a una modalidad: sin modalidades, a todas (ADR-0007). */
export const aplicaAModalidad = (r: Pick<RequisitoAdmin, 'modalidades'>, m: Modalidad): boolean =>
  r.modalidades.length === 0 || r.modalidades.includes(m);

/** Las modalidades que quedan al marcar o desmarcar una; null si quedaría sin ninguna. */
export function alternarModalidad(
  actuales: readonly Modalidad[],
  m: Modalidad,
  todas: readonly Modalidad[],
): Modalidad[] | null {
  const marcadas = actuales.length === 0 ? [...todas] : [...actuales];
  const nuevas = marcadas.includes(m) ? marcadas.filter((x) => x !== m) : [...marcadas, m];
  if (nuevas.length === 0) return null;
  return todas.filter((x) => nuevas.includes(x));
}

export function validarModalidad(d: { codigo: string; nombre: string }): Partial<Record<'codigo' | 'nombre', string>> {
  const e: Partial<Record<'codigo' | 'nombre', string>> = {};
  if (!/^[A-Z0-9]{1,10}$/.test(d.codigo.trim().toUpperCase()))
    e.codigo = 'El código lleva solo letras y números, hasta 10 (por ejemplo, B4)';
  const n = d.nombre.trim();
  if (n.length < 2) e.nombre = 'El nombre necesita al menos 2 caracteres';
  else if (n.length > 80) e.nombre = 'Máximo 80 caracteres';
  return e;
}
