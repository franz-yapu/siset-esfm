import express, { type Express } from 'express';

/**
 * Arma la aplicación Express sin abrir un puerto, para que los tests la usen
 * directamente. S0.7 agrega aquí los middlewares transversales y monta el
 * router de cada módulo de `src/modulos/` (ADR-0001).
 */
export function crearApp(): Express {
  const app = express();
  app.use(express.json());
  return app;
}
