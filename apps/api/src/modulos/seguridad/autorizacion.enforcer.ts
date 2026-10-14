import { newEnforcer, newModelFromString, StringAdapter, type Enforcer } from 'casbin';
import { MODELO } from './autorizacion.modelo';
import { POLITICA } from './autorizacion.politica';

/** Casbin con la política en memoria: sin archivos ni base (ADR-0002, enmienda S1.6). */
export const crearEnforcer = (): Promise<Enforcer> =>
  newEnforcer(
    newModelFromString(MODELO),
    new StringAdapter(POLITICA.map(([rol, recurso, accion]) => `p, ${rol}, ${recurso}, ${accion}`).join('\n')),
  );
