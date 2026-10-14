import type { Usuario } from '@/types';
import { inactivoDemasiado } from '@/lib/inactividad';

export type MotivoCierre = 'INACTIVIDAD' | 'SESION_VENCIDA';

export interface SesionInicial {
  usuario: Usuario | null;
  motivo: MotivoCierre | null;
}

/**
 * Qué sesión hay al arrancar la app (SDD S1.10 §2.4). Si la última actividad registrada pasó
 * el límite (pestaña cerrada, equipo suspendido), se cierra sin intentar el refresh; si no, se
 * restaura con la cookie. Pura: recibe todo lo que usa.
 */
export async function sesionInicial(o: {
  ahora: number;
  ultimaActividad: number | null;
  restaurar: () => Promise<Usuario | null>;
  cerrar: () => Promise<void>;
}): Promise<SesionInicial> {
  if (inactivoDemasiado(o.ultimaActividad, o.ahora)) {
    await o.cerrar().catch(() => undefined);
    return { usuario: null, motivo: 'INACTIVIDAD' };
  }
  const usuario = await o.restaurar().catch(() => null);
  return { usuario, motivo: null };
}
