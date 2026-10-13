import { readFileSync } from 'node:fs';
import { crearApp } from '@/app';
import { crearClienteBd } from '@/compartido/bd';
import { cargarConfig, type Config } from '@/compartido/config';
import { crearLogger } from '@/compartido/logger';

try {
  process.loadEnvFile();
} catch {
  // Sin `.env`: las variables vienen del entorno.
}

let config: Config;
try {
  config = cargarConfig();
} catch (e) {
  // Todavía no hay logger: el error de configuración va a stderr y no muestra valores.
  // eslint-disable-next-line no-console
  console.error((e as Error).message);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};
const logger = crearLogger(config);
const bd = crearClienteBd(config.databaseUrl);
const servidor = crearApp({ bd, config, logger, version }).listen(config.puerto, () => {
  logger.info({ puerto: config.puerto, entorno: config.entorno }, 'API de SISET escuchando');
});

/** Cierre ordenado: deja de aceptar conexiones y después cierra la base de datos. */
const cerrar = (senal: string) => {
  logger.info({ senal }, 'Cerrando la API');
  servidor.close(() => {
    void bd.$disconnect().finally(() => process.exit(0));
  });
};
process.once('SIGTERM', () => cerrar('SIGTERM'));
process.once('SIGINT', () => cerrar('SIGINT'));
