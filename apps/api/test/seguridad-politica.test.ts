import { describe, expect, it } from 'vitest';
import { ACCIONES, POLITICA, RECURSOS } from '@/modulos/seguridad';
import { crearEnforcer } from '@/modulos/seguridad/autorizacion.enforcer';
import { ROLES } from '@/modulos/seguridad/autorizacion.politica';

// Matriz esperada ESCRITA A MANO desde el PRD §2 (SDD S1.6 §2.2), no derivada de POLITICA:
// si alguien cambia un permiso en politica.ts, este test lo obliga a cambiarlo también aquí.
// EGRESADO no tiene cuenta (D-08): ningún permiso. ADMIN administra usuarios y bitácora y SEC_DIR no ve files (DEC-054).
const C = 'crear';
const L = 'leer';
const P = 'leer_propio';
const E = 'editar';
const ESPERADA: Record<string, Record<string, string[]>> = {
  usuarios: { ADMIN: [C, L, E] },
  files: { ESTUDIANTE: [P], SEC_COORD: [L], COORDINADOR: [L], KARDEX: [C, L, E] },
  requisitos: { ESTUDIANTE: [P], SEC_COORD: [L], COORDINADOR: [L], KARDEX: [C, L, E] },
  'hojas-ruta': { SEC_DIR: [C, L], SEC_COORD: [L], COORDINADOR: [L], KARDEX: [L, E] },
  pases: { SEC_DIR: [C, L], SEC_COORD: [C, L], COORDINADOR: [L], KARDEX: [C, L] },
  dictamenes: { COORDINADOR: [C, L], KARDEX: [L] },
  documentos: { KARDEX: [C, L] },
  reportes: { SEC_DIR: [L], COORDINADOR: [L], KARDEX: [L] },
  auditoria: { ADMIN: [L] },
};

const combinaciones = ROLES.flatMap((rol) =>
  RECURSOS.flatMap((recurso) =>
    ACCIONES.map((accion) => ({
      rol,
      recurso,
      accion,
      permitido: ESPERADA[recurso]?.[rol]?.includes(accion) ?? false,
    })),
  ),
);

describe('matriz completa de autorización (ADR-0002, SDD S1.6 §4)', () => {
  it('cubre las 252 combinaciones rol × recurso × acción', () => {
    expect(combinaciones).toHaveLength(252);
  });

  it.each(combinaciones)('$rol · $recurso · $accion → $permitido', async ({ rol, recurso, accion, permitido }) => {
    const e = await crearEnforcer();
    expect(await e.enforce(rol, recurso, accion)).toBe(permitido);
  });

  it('un rol inexistente no tiene ningún permiso', async () => {
    const e = await crearEnforcer();
    expect(await e.enforce('SUPERUSUARIO', 'usuarios', 'leer')).toBe(false);
  });
});

describe('integridad de la política', () => {
  it('no tiene filas repetidas', () => {
    const filas = POLITICA.map((p) => p.join(','));
    expect(new Set(filas).size).toBe(filas.length);
  });

  it('EGRESADO no tiene permisos (D-08)', () => {
    expect(POLITICA.filter(([rol]) => rol === 'EGRESADO')).toEqual([]);
  });
});
