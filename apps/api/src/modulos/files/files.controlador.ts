import type { RequestHandler } from 'express';
import { datosValidos } from '@/compartido/http';
import {
  esquemasBloquearFile,
  esquemasCrearFile,
  esquemasDesbloquearFile,
  esquemasEditarFile,
  esquemasImportarFiles,
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

  const importar: RequestHandler = async (_req, res) => {
    const { body } = datosValidos(res, esquemasImportarFiles);
    res.json(await servicio.importar(body.filas, body.aplicar));
  };

  const editar: RequestHandler = async (_req, res) => {
    const { params, body } = datosValidos(res, esquemasEditarFile);
    res.json(await servicio.editar(params.id, body));
  };

  /** `recibirPdfResolucion` ya dejó el PDF revisado en `req.file`. */
  const bloquear: RequestHandler = async (req, res) => {
    const { params, body } = datosValidos(res, esquemasBloquearFile);
    const pdf = req.file!;
    res.json(await servicio.bloquear(params.id, body, { contenido: pdf.buffer, nombre: pdf.originalname }));
  };

  const desbloquear: RequestHandler = async (_req, res) => {
    res.json(await servicio.desbloquear(datosValidos(res, esquemasDesbloquearFile).params.id));
  };

  const bloqueo: RequestHandler = async (_req, res) => {
    res.json(await servicio.bloqueo(datosValidos(res, esquemasUnFile).params.id));
  };

  /** El PDF se muestra en el navegador; `nosniff` (helmet) evita que se interprete como otra cosa. */
  const pdfBloqueo: RequestHandler = async (_req, res) => {
    const pdf = await servicio.pdfBloqueo(datosValidos(res, esquemasUnFile).params.id);
    res
      .type('application/pdf')
      .set('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(pdf.nombre)}`)
      .set('Cache-Control', 'private, no-store')
      .send(pdf.contenido);
  };

  const mio: RequestHandler = async (_req, res) => {
    res.json(await servicio.obtener(await servicio.idPropio()));
  };

  return { listar, obtener, mio, crear, importar, editar, bloquear, desbloquear, bloqueo, pdfBloqueo };
};
