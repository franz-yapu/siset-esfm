/** Error de una regla de negocio: su mensaje se muestra tal cual al usuario. */
export class ErrorNegocio extends Error {}

/**
 * Error que viene de la API (formato único de S0.7). Extiende ErrorNegocio para
 * que las pantallas lo traten igual que el error del mock (SDD S0.8 §2.2).
 */
export class ErrorApi extends ErrorNegocio {
  constructor(
    message: string,
    readonly codigo: string,
    readonly estado?: number,
    readonly detalles?: unknown,
  ) {
    super(message);
    this.name = 'ErrorApi';
  }
}
