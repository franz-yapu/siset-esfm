import type { RequestHandler } from 'express';
import type { ServicioSalud } from './salud.servicio';

export const crearControladorSalud = (servicio: ServicioSalud) => {
  const obtener: RequestHandler = async (_req, res) => {
    res.json(await servicio.estado());
  };
  return { obtener };
};
