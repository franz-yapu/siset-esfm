import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { ErrorValidacion } from '@/compartido/errores';

/** El CHECK `ck_bloqueo_pdf` de la tabla: hasta 5 MB. */
export const PDF_MAX_BYTES = 5 * 1024 * 1024;

const invalido = (mensaje: string) => new ErrorValidacion([{ ruta: 'body.pdf', mensaje }]);

/** En memoria: el PDF va a la base (bytea), nunca al disco del contenedor. */
const subir = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_MAX_BYTES, files: 1, fields: 10, fieldSize: 1024 },
}).single('pdf');

/** Un PDF de verdad empieza con `%PDF-`; el tipo que declara el navegador no alcanza. */
const esPdf = (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-';

/**
 * Recibe el `multipart/form-data` del bloqueo (DEC-049): deja los campos de texto en `req.body` para `validar` y
 * exige un PDF en `pdf`. Cualquier problema con el archivo es un 400 VALIDACION sobre `body.pdf`.
 */
export const recibirPdfResolucion: RequestHandler = (req, res, next) => {
  subir(req, res, (e: unknown) => {
    if (e instanceof MulterError) {
      next(
        e.code === 'LIMIT_FILE_SIZE'
          ? invalido('El PDF pesa más de 5 MB')
          : invalido('Envíe un solo archivo, en el campo "pdf"'),
      );
      return;
    }
    if (e) {
      next(e);
      return;
    }
    if (!req.file) {
      next(invalido('Adjunte el PDF de la resolución'));
      return;
    }
    if (!esPdf(req.file.buffer)) {
      next(invalido('El archivo no es un PDF'));
      return;
    }
    next();
  });
};
