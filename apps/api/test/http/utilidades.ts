import type { ClienteBd } from '@/compartido/bd';
import type { Config } from '@/compartido/config';
import type { ModuloHttp } from '@/compartido/http';
import { crearApp } from '@/app';

export const configDePrueba = (extra: Partial<Config> = {}): Config => ({
  entorno: 'test',
  puerto: 0,
  databaseUrl: 'postgresql://prueba@localhost/prueba',
  corsOrigen: ['http://localhost:5173'],
  trustProxy: 0,
  nivelLog: 'silent',
  jsonLimite: '1kb',
  ...extra,
});

/** BD falsa: solo lo que usa el módulo salud. `ping` decide si responde o falla. */
export const bdFalsa = (ping: () => Promise<unknown> = async () => [{ ok: 1 }]): ClienteBd =>
  ({ $queryRaw: () => ping() }) as unknown as ClienteBd;

export const appDePrueba = (opciones: { config?: Partial<Config>; bd?: ClienteBd; modulosExtra?: ModuloHttp[] } = {}) =>
  crearApp({
    bd: opciones.bd ?? bdFalsa(),
    config: configDePrueba(opciones.config),
    version: '9.9.9',
    modulosExtra: opciones.modulosExtra ?? [],
  });
