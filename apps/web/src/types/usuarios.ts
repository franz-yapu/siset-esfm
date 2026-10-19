import type { Rol } from './index';

// Contrato de /api/v1/usuarios (SDD S1.8 §2.2). El mock lo imita (SDD S1.13 §2.1).

/** La API crea y edita solo cuentas del personal (DEC-020 #1). */
export const ROLES_PERSONAL = ['SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX', 'ADMIN'] as const;
export type RolPersonal = (typeof ROLES_PERSONAL)[number];

export const ESTADOS_USUARIO = ['ACTIVO', 'INACTIVO', 'BLOQUEADO'] as const;
export type EstadoUsuario = (typeof ESTADOS_USUARIO)[number];

export const esRolPersonal = (rol: Rol): rol is RolPersonal => (ROLES_PERSONAL as readonly Rol[]).includes(rol);

/** Cuenta y datos personales. Nunca trae la contraseña ni su hash. */
export interface UsuarioDetalle {
  id: number;
  /** CI o CI-COMPLEMENTO (D-25). */
  usuario: string;
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombre: string;
  email: string | null;
  celular: string | null;
  /** La lista puede traer otras cuentas; el formulario ofrece solo `RolPersonal`. */
  rol: Rol;
  sedeId: number | null;
  activo: boolean;
  estado: EstadoUsuario;
  bloqueadoHasta: string | null;
  debeCambiarPassword: boolean;
  ultimoAcceso: string | null;
}

export interface DatosCrearUsuario {
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  email: string | null;
  celular: string | null;
  rol: RolPersonal;
  sedeId: number;
}

/** El CI y el complemento no se editan (DEC-020 #3). Solo los campos que cambian. */
export type CambiosUsuario = Partial<Omit<DatosCrearUsuario, 'ci' | 'complemento'>>;

export interface FiltrosUsuarios {
  texto?: string;
  rol?: RolPersonal;
  sedeId?: number;
  estado?: EstadoUsuario;
  pagina: number;
  porPagina: number;
}

/** Respuesta de crear y de restablecer: la temporal se muestra una sola vez. */
export interface UsuarioConPassword {
  usuario: UsuarioDetalle;
  passwordTemporal: string;
}
