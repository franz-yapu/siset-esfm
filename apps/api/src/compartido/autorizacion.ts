import { ErrorProhibido } from './errores';

// "Propio" y sede (SDD S1.6 §2.4, CLAUDE.md): las reglas que Casbin no decide. Funciones
// puras: el servicio resuelve los datos y llama aquí. Con `leer_propio`, el repositorio
// filtra por la persona de la sesión (`where`), nunca por el id que manda el cliente.

/** 403 si el recurso no es del usuario. */
export function exigirPropio(esPropio: boolean): void {
  if (!esPropio) throw new ErrorProhibido();
}

/** 403 si el usuario no es de la sede del recurso (D-24: el personal tiene una sola sede). */
export function exigirSede(sedeUsuario: number | null, sedeRecurso: number): void {
  if (sedeUsuario === null || sedeUsuario !== sedeRecurso) throw new ErrorProhibido();
}
