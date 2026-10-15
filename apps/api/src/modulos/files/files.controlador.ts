import type { RequestHandler } from 'express';
import { datosValidos } from '@/compartido/http';
import {
  esquemasBloquearFile,
  esquemasCrearFile,
  esquemasDesbloquearFile,
  esquemasEditarFile,
  esquemasListarFiles,
  esquemasUnFile,
} from './files.esquemas';
import type { ServicioFiles } from './files.servicio';

export const crearControladorFiles = (servicio: ServicioFiles) => {
  const listar: RequestHandler = async (_req, res) => {
    res.json(await servicio.listar(datosValidos(res, esquemasListarFiles).query));
  };

  const obtener: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(datosValidos(res, esquemasUnFile).params.id));
  };

  const crear: RequestHandler = async (_req, res) => {
    res.status(201).json(await servicio.crear(datosValidos(res, esquemasCrearFile).body));
  };

  const editar: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasEditarFile);
    res.json(await servicio.editar(params.id, body));
  };

  const bloquear: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasBloquearFile);
    res.json(await servicio.bloquear(params.id, body.motivo));
  };

  const desbloquear: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasDesbloquearFile);
    res.json(await servicio.desbloquear(params.id, body.resolucion));
  };

  const mio: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(await servicio.idPropio()));
  };

  return { listar, obtener, mio, crear, editar, bloquear, desbloquear };
};
