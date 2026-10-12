export type Rol = 'ESTUDIANTE' | 'EGRESADO' | 'SEC_DIR' | 'SEC_COORD' | 'COORDINADOR' | 'KARDEX';

export type EstadoTramite =
  | 'REGISTRADO' | 'EN_TRANSITO_ANC' | 'RECIBIDO' | 'EN_REVISION' | 'OBSERVADO'
  | 'DICTAMINADO' | 'EN_IMPRESION' | 'EN_TRANSITO_LP' | 'EN_FIRMA' | 'LISTO' | 'ENTREGADO';

export type ColorSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';
export type EstadoRequisito = 'PENDIENTE' | 'COMPLETO';
export type CodigoRequisito = 'TACFI' | 'TCLO' | 'CERT_NOTAS';
export type NivelTclo = 'Básico' | 'Intermedio' | 'Avanzado';
export type TipoTramite = 'Historial académico' | 'Copia legalizada' | 'Certificación';
export type TipoDocumento = 'HISTORIAL' | 'TCLO' | 'TACFI';

export interface Sede { id: number; codigo: 'LA_PAZ' | 'ANCOCAGUA'; nombre: string }

export interface Usuario {
  id: number; usuario: string; nombre: string; rol: Rol; sedeId: number | null;
  activo: boolean; fileId?: number; ultimoAcceso?: string;
  correo?: string; bloqueadoHasta?: string; debeCambiarClave?: boolean;
}

export interface Requisito {
  estado: EstadoRequisito; fecha?: string; nro?: string; nivel?: NivelTclo; responsable?: string;
}

export interface Matricula { anio: number; gestion: number; estado: 'Vigente' | 'Concluida' }
export interface ResultadoAnual { anio: number; resultado: 'APROBADO' | 'REPROBADO'; ufReprobadas: number }

export interface FileAcademico {
  id: number; ci: string; nombres: string; apellidos: string; codigo: string;
  especialidad: string; anioIngreso: number; condicion: 'ESTUDIANTE' | 'EGRESADO';
  fechaNacimiento?: string; celular?: string; correo?: string;
  bloqueado: boolean; motivoBloqueo?: string;
  matriculas: Matricula[];
  resultados: ResultadoAnual[];
  requisitos: Record<CodigoRequisito, Requisito>;
}

export interface Movimiento {
  estado: EstadoTramite; fecha: string; sedeId: number; usuario: string; obs?: string;
}

export interface Dictamen { nro: string; resultado: 'APROBADO' | 'OBSERVADO'; obs?: string; fecha: string; coordinador: string }

export interface DocumentoEmitido {
  id: number; nro: string; tipo: TipoDocumento; nroValorado: string; usuario: string;
  fecha: string; esReimpresion: boolean; motivo?: string;
}

export interface Entrega { entregadoA: 'Titular' | 'Apoderado'; ciReceptor: string; fecha: string }

export interface HojaRuta {
  nro: string; fileId: number; tipo: TipoTramite;
  estado: EstadoTramite; sedeActualId: number; fechaIngreso: string; nroValorado?: string;
  movimientos: Movimiento[];
  /** En revisión y ya enviado por Kardex al Coordinador (sub-estado de EN_REVISION). */
  enviadoDictamen?: boolean;
  entrega?: Entrega;
}

export interface RegistroBitacora {
  id: number; fecha: string; usuario: string; ip: string; modulo: string; accion: string;
  registro: string; antes: Record<string, unknown> | null; despues: Record<string, unknown> | null;
}

/** Vista combinada que usan las tablas: hoja de ruta + datos del titular. */
export interface HojaRutaConTitular extends HojaRuta {
  titular: string; ci: string; especialidad: string; semaforo: ColorSemaforo;
}
