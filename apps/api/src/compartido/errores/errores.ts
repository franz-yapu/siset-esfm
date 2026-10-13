/** Error con estado HTTP y código estable. El mensaje está en español y se puede mostrar al usuario (SDD S0.7 §2.3). */
export abstract class ErrorApp extends Error {
  abstract readonly estado: number;

  constructor(
    mensaje: string,
    readonly codigo: string,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

export class ErrorValidacion extends ErrorApp {
  readonly estado = 400;
  constructor(detalles: unknown, mensaje = 'Los datos enviados no son válidos.') {
    super(mensaje, 'VALIDACION', detalles);
  }
}

export class ErrorNoAutenticado extends ErrorApp {
  readonly estado = 401;
  constructor(mensaje = 'Necesita iniciar sesión.', codigo = 'NO_AUTENTICADO') {
    super(mensaje, codigo);
  }
}

export class ErrorProhibido extends ErrorApp {
  readonly estado = 403;
  constructor(mensaje = 'No tiene permiso para realizar esta acción.') {
    super(mensaje, 'PROHIBIDO');
  }
}

export class ErrorNoEncontrado extends ErrorApp {
  readonly estado = 404;
  constructor(mensaje = 'El recurso solicitado no existe.') {
    super(mensaje, 'NO_ENCONTRADO');
  }
}

/** Choca con el estado actual del recurso (duplicado, modificado por otra persona). */
export class ErrorConflicto extends ErrorApp {
  readonly estado = 409;
  constructor(mensaje = 'El recurso entra en conflicto con su estado actual.', detalles?: unknown) {
    super(mensaje, 'CONFLICTO', detalles);
  }
}

/** La petición es válida pero una regla de negocio la impide (equivale al ErrorNegocio del prototipo). */
export class ErrorNegocio extends ErrorApp {
  readonly estado = 422;
  constructor(mensaje: string, codigo = 'REGLA_NEGOCIO', detalles?: unknown) {
    super(mensaje, codigo, detalles);
  }
}

/** Un servicio del que depende la API no responde (p. ej. la base de datos). */
export class ErrorServicioNoDisponible extends ErrorApp {
  readonly estado = 503;
  constructor(mensaje: string, codigo = 'SERVICIO_NO_DISPONIBLE') {
    super(mensaje, codigo);
  }
}
