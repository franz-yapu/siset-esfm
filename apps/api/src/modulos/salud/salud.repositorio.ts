import type { ClienteBd } from '@/compartido/bd';

export type BdSalud = Pick<ClienteBd, '$queryRaw'>;

export const crearRepositorioSalud = (bd: BdSalud) => ({
  /** Lanza si la base de datos no responde. */
  async ping(): Promise<void> {
    await bd.$queryRaw`SELECT 1`;
  },
});

export type RepositorioSalud = ReturnType<typeof crearRepositorioSalud>;
