import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ESPECIALIDADES, ROLES, SEDES } from '../prisma/semilla';

// Lee la configuración del prototipo como texto (la API no importa del frontend)
// para que el seed no se desincronice de los códigos que ya usa la web.
const web = (archivo: string) => readFileSync(new URL(`../../web/src/config/${archivo}`, import.meta.url), 'utf8');

describe('el seed usa los mismos códigos y nombres que el prototipo', () => {
  it('roles', () => {
    const bloque = web('permisos.ts').split('export const ROLES')[1].split('};')[0];
    const roles = [...bloque.matchAll(/(\w+):\s*\{\s*nombre:\s*'([^']+)'/g)].map(([, codigo, nombre]) => ({
      codigo,
      nombre,
    }));
    expect(roles).toEqual(ROLES);
  });

  it('sedes', () => {
    const sedes = [...web('catalogos.ts').matchAll(/codigo:\s*'(\w+)',\s*nombre:\s*'([^']+)'/g)].map(
      ([, codigo, nombre]) => ({ codigo, nombre }),
    );
    expect(sedes).toEqual(SEDES);
  });

  it('especialidades', () => {
    const bloque = web('catalogos.ts').split('export const ESPECIALIDADES = [')[1].split('];')[0];
    expect([...bloque.matchAll(/'([^']+)'/g)].map(([, n]) => n)).toEqual(ESPECIALIDADES);
  });
});
