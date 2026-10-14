import type { RequestHandler } from 'express';
import { datosValidos } from '@/compartido/http';
import { sesionDe } from './autenticar';
import {
  esquemasCrearUsuario,
  esquemasEditarUsuario,
  esquemasListarUsuarios,
  esquemasUnUsuario,
} from './usuarios.esquemas';
import type { ServicioUsuarios } from './usuarios.servicio';

export const crearControladorUsuarios = (servicio: ServicioUsuarios) => {
  const idDe = (res: Parameters<RequestHandler>[1]) => datosValidos(res, esquemasUnUsuario).params.id;

  const listar: RequestHandler = async (_req, res) => {
    res.json(await servicio.listar(datosValidos(res, esquemasListarUsuarios).query));
  };

  const obtener: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(idDe(res)));
  };

  const crear: RequestHandler = async (_req, res) => {
    res.status(201).json(await servicio.crear(datosValidos(res, esquemasCrearUsuario).body));
  };

  const editar: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasEditarUsuario);
    res.json(await servicio.editar(sesionDe(res).usuarioId, params.id, body));
  };

  const darDeBaja: RequestHandler = async (_req, res) => {
    res.json(await servicio.darDeBaja(sesionDe(res).usuarioId, idDe(res)));
  };

  const reactivar: RequestHandler = async (_req, res) => {
    res.json(await servicio.reactivar(idDe(res)));
  };

  const restablecerPassword: RequestHandler = async (_req, res) => {
    res.json(await servicio.restablecerPassword(idDe(res)));
  };

  const desbloquear: RequestHandler = async (_req, res) => {
    res.json(await servicio.desbloquear(idDe(res)));
  };

  return { listar, obtener, crear, editar, darDeBaja, reactivar, restablecerPassword, desbloquear };
};
