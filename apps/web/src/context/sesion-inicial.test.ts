import { describe, expect, it, vi } from 'vitest';
import type { Usuario } from '@/types';
import { sesionInicial } from './sesion-inicial';

const MIN = 60_000;
const ana = { id: 1, usuario: '1234567', nombre: 'Ana', rol: 'KARDEX', sedeId: 2, activo: true } satisfies Usuario;

const armar = (ultimaActividad: number | null, restaurado: Usuario | null = ana) => {
  const restaurar = vi.fn(async () => restaurado);
  const cerrar = vi.fn(async () => undefined);
  const ahora = 100 * MIN;
  return {
    restaurar,
    cerrar,
    correr: () =>
      sesionInicial({
        ahora,
        ultimaActividad: ultimaActividad === null ? null : ahora - ultimaActividad,
        restaurar,
        cerrar,
      }),
  };
};

describe('sesionInicial (SDD S1.10 §2.4)', () => {
  it('actividad de hace 16 min → cierra sin refresh, motivo INACTIVIDAD', async () => {
    const { correr, restaurar, cerrar } = armar(16 * MIN);
    expect(await correr()).toEqual({ usuario: null, motivo: 'INACTIVIDAD' });
    expect(restaurar).not.toHaveBeenCalled();
    expect(cerrar).toHaveBeenCalledTimes(1);
  });

  it('actividad de hace 2 min → restaura', async () => {
    const { correr, cerrar } = armar(2 * MIN);
    expect(await correr()).toEqual({ usuario: ana, motivo: null });
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('sin registro → restaura', async () => {
    const { correr, restaurar } = armar(null);
    expect(await correr()).toEqual({ usuario: ana, motivo: null });
    expect(restaurar).toHaveBeenCalledTimes(1);
  });

  it('sin sesión en el servidor → sin usuario y sin motivo', async () => {
    const { correr } = armar(null, null);
    expect(await correr()).toEqual({ usuario: null, motivo: null });
  });

  it('si cerrar falla (sin red), igual queda sin sesión por inactividad', async () => {
    const { correr, cerrar } = armar(30 * MIN);
    cerrar.mockRejectedValueOnce(new Error('sin red'));
    expect(await correr()).toEqual({ usuario: null, motivo: 'INACTIVIDAD' });
  });
});
