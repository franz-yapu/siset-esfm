import { describe, expect, it } from 'vitest';
// Se lee como texto: la web no puede importar código de la API.
import fuenteApi from '../../../api/src/modulos/auditoria/auditoria.esquemas.ts?raw';
import { ACCIONES, ACCIONES_AUDITORIA, MODULOS, MODULOS_AUDITORIA } from './auditoria';

/** Extrae los textos del arreglo `export const <nombre> = [ ... ] as const`. */
const listaDeLaApi = (nombre: string): string[] => {
  const cuerpo = new RegExp(`export const ${nombre} = \\[([\\s\\S]*?)\\] as const`).exec(fuenteApi)?.[1];
  if (!cuerpo) throw new Error(`No se encontró ${nombre} en auditoria.esquemas.ts`);
  return [...cuerpo.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
};

describe('listas cerradas de la bitácora (SDD S6.5 §2.2)', () => {
  it('las acciones son las mismas que en la API', () => {
    expect([...ACCIONES_AUDITORIA]).toEqual(listaDeLaApi('ACCIONES_AUDITORIA'));
  });

  it('los módulos son los mismos que en la API', () => {
    expect([...MODULOS_AUDITORIA]).toEqual(listaDeLaApi('MODULOS_AUDITORIA'));
  });

  it('cada código tiene su etiqueta en español', () => {
    for (const a of ACCIONES_AUDITORIA) expect(ACCIONES[a].etiqueta).not.toBe('');
    for (const m of MODULOS_AUDITORIA) expect(MODULOS[m]).not.toBe('');
  });
});
