import { afterEach, describe, expect, it, vi } from 'vitest';
import { avisoOcultoParaSiempre, ocultarAvisoParaSiempre } from './aviso-primer-ingreso';

// Las pruebas corren en node: un almacenamiento de mentira, y uno que falla como en una ventana privada.
const memoria = () => {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
};
const bloqueado = () => {
  throw new Error('bloqueado');
};

describe('aviso del primer ingreso (DEC-067)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('"no volver a mostrar" queda guardado y se puede deshacer', () => {
    vi.stubGlobal('localStorage', memoria());
    expect(avisoOcultoParaSiempre()).toBe(false);
    ocultarAvisoParaSiempre(true);
    expect(avisoOcultoParaSiempre()).toBe(true);
    ocultarAvisoParaSiempre(false);
    expect(avisoOcultoParaSiempre()).toBe(false);
  });

  it('sin almacenamiento el aviso vuelve a salir y nada falla', () => {
    vi.stubGlobal('localStorage', { getItem: bloqueado, setItem: bloqueado, removeItem: bloqueado });
    expect(() => ocultarAvisoParaSiempre(true)).not.toThrow();
    expect(avisoOcultoParaSiempre()).toBe(false);
  });
});
