import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { ErrorValidacion } from '@/compartido/errores';
import type { TipoFoto } from './files.servicio';

/** El CHECK `ck_persona_foto_tamano`: hasta 1 MB. La web la recorta a 400 px antes, así que pesa mucho menos. */
export const FOTO_MAX_BYTES = 1024 * 1024;

const invalida = (mensaje: string) => new ErrorValidacion([{ ruta: 'body.foto', mensaje }]);

/** En memoria: la foto va a la base (bytea), nunca al disco del contenedor. */
const subir = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FOTO_MAX_BYTES, files: 1, fields: 0 },
}).single('foto');

/** El tipo por los primeros bytes: lo que declara el navegador no alcanza (ADR-0013). */
export function tipoDeImagen(b: Buffer): TipoFoto | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (
    b.length > 12 &&
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Recibe el `multipart/form-data` con la foto en `foto` (ADR-0013). Deja el tipo verificado en `res.locals.tipoFoto`.
 * Cualquier problema con el archivo es un 400 VALIDACION sobre `body.foto`.
 */
export const recibirFoto: RequestHandler = (req, res, next) => {
  subir(req, res, (e: unknown) => {
    if (e instanceof MulterError) {
      next(
        e.code === 'LIMIT_FILE_SIZE'
          ? invalida('La foto pesa más de 1 MB')
          : invalida('Envíe una sola imagen, en el campo "foto"'),
      );
      return;
    }
    if (e) {
      next(e);
      return;
    }
    if (!req.file) {
      next(invalida('Adjunte la foto'));
      return;
    }
    const tipo = tipoDeImagen(req.file.buffer);
    if (!tipo) {
      next(invalida('La foto tiene que ser JPG, PNG o WebP'));
      return;
    }
    res.locals.tipoFoto = tipo;
    next();
  });
};
