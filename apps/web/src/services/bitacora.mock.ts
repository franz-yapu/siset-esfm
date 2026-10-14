import type { RegistroBitacora } from '@/types';
import type { AccionAuditoria, ModuloAuditoria } from '@/config/auditoria';
import type { FiltrosAuditoria, RegistroAuditoria, UsuarioBitacora } from '@/types/bitacora';
import { db } from '@/mocks/db';
import { delay } from '@/lib/formato';
import { LATENCIA } from './_comun';
import { MAX_USUARIOS_BUSCADOR, type ServicioBitacora } from './bitacora.api';

// El almacén del prototipo (db.bitacora, textos libres) no se toca: lo escriben los
// servicios mock de otros tickets. Se traduce al contrato de la API al leer (SDD S6.5 §2.4).

const MODULO: Record<string, ModuloAuditoria> = {
  Seguridad: 'SEGURIDAD',
  Usuarios: 'SEGURIDAD',
  Files: 'FILES',
  'Hojas de ruta': 'HOJAS_RUTA',
  Pases: 'PASES',
  Emisión: 'DOCUMENTOS',
};

const ACCION: Record<string, AccionAuditoria> = {
  'Inicio de sesión': 'LOGIN',
  'Inicio de sesión fallido': 'LOGIN_FALLIDO',
  'Cuenta bloqueada por 5 intentos fallidos': 'BLOQUEO_CUENTA',
  'Cierre de sesión': 'LOGOUT',
  'Cambio de contraseña': 'CAMBIAR_PASSWORD',
  'Resetear contraseña': 'RESTABLECER_PASSWORD',
  'Dar de baja usuario': 'DAR_DE_BAJA',
  'Reactivar usuario': 'REACTIVAR',
  'Reimprimir documento': 'IMPRIMIR',
  'Registrar hoja de ruta': 'CREAR',
  'Registrar matrícula': 'CREAR',
  'Carga masiva de files': 'CREAR',
  'Bloquear file': 'BLOQUEAR',
  'Desbloquear file': 'DESBLOQUEAR',
};

const ENTIDAD: Record<ModuloAuditoria, string> = {
  SEGURIDAD: 'usuario',
  PERSONAS: 'persona',
  CATALOGOS: 'catalogo',
  FILES: 'file',
  HOJAS_RUTA: 'hoja_ruta',
  PASES: 'hoja_ruta',
  DICTAMENES: 'dictamen',
  DOCUMENTOS: 'documento',
  REPORTES: 'reporte',
  AUDITORIA: 'log_auditoria',
};

export function moduloDe(texto: string): ModuloAuditoria {
  const m = MODULO[texto];
  if (!m) throw new Error(`Módulo del prototipo sin traducción: "${texto}"`);
  return m;
}

export function accionDe(texto: string, modulo: ModuloAuditoria): AccionAuditoria {
  const exacta = ACCION[texto];
  if (exacta) return exacta;
  if (texto.startsWith('Crear ')) return 'CREAR';
  // Las transiciones de lib/transiciones.ts usan la etiqueta de la regla como acción.
  if (modulo === 'HOJAS_RUTA' || modulo === 'PASES') return 'CAMBIAR_ESTADO';
  return 'EDITAR';
}

/** `aaaa-mm-ddThh:mm[:ss]` en hora de La Paz (sin zona) → ISO en UTC, como la API. */
export function isoDesdeLocal(local: string): string {
  const conSegundos = local.length === 16 ? `${local}:00` : local.slice(0, 19);
  return new Date(`${conSegundos}-04:00`).toISOString();
}

/** Fecha AAAA-MM-DD en La Paz (UTC−4, sin horario de verano) de un ISO en UTC. */
export const diaLaPaz = (iso: string): string =>
  new Date(new Date(iso).getTime() - 4 * 3_600_000).toISOString().slice(0, 10);

const autorDe = (nombre: string): UsuarioBitacora | null => {
  const u = db.usuarios.find((x) => x.nombre === nombre);
  return u ? { id: u.id, usuario: u.usuario, nombre: u.nombre } : null;
};

const comoObjetoONulo = (v: Record<string, unknown> | null): Record<string, unknown> | null =>
  v ? structuredClone(v) : null;

/** Traduce un registro del prototipo al contrato de GET /auditoria. */
export function aRegistroAuditoria(r: RegistroBitacora): RegistroAuditoria {
  const modulo = moduloDe(r.modulo);
  const entidad = ENTIDAD[modulo];
  const afectado = modulo === 'SEGURIDAD' ? db.usuarios.find((x) => x.usuario === r.registro) : undefined;
  return {
    id: r.id,
    fecha: isoDesdeLocal(r.fecha),
    usuario: autorDe(r.usuario),
    accion: accionDe(r.accion, modulo),
    modulo,
    entidad,
    entidadId: afectado ? String(afectado.id) : r.registro,
    antes: comoObjetoONulo(r.antes),
    despues: comoObjetoONulo(r.despues),
    ip: r.ip && r.ip !== '—' ? r.ip : null,
    userAgent: null,
  };
}

const cumple = (r: RegistroAuditoria, f: FiltrosAuditoria): boolean => {
  const dia = diaLaPaz(r.fecha);
  return (
    (f.usuarioId === undefined || r.usuario?.id === f.usuarioId) &&
    (!f.modulo || r.modulo === f.modulo) &&
    (!f.accion || r.accion === f.accion) &&
    (!f.desde || dia >= f.desde) &&
    (!f.hasta || dia <= f.hasta) &&
    (!f.entidad || r.entidad === f.entidad) &&
    (!f.entidadId || r.entidadId === f.entidadId)
  );
};

const sinTildes = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export const bitacoraMock: ServicioBitacora = {
  async listar(f, pagina, porPagina) {
    await delay(LATENCIA);
    const todos = db.bitacora
      .map(aRegistroAuditoria)
      .filter((r) => cumple(r, f))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    const inicio = (pagina - 1) * porPagina;
    return { datos: todos.slice(inicio, inicio + porPagina), pagina, porPagina, total: todos.length };
  },

  async buscarUsuarios(texto) {
    await delay(LATENCIA);
    const t = sinTildes(texto.trim());
    return db.usuarios
      .filter((u) => sinTildes(`${u.usuario} ${u.nombre}`).includes(t))
      .slice(0, MAX_USUARIOS_BUSCADOR)
      .map(({ id, usuario, nombre }) => ({ id, usuario, nombre }));
  },
};
