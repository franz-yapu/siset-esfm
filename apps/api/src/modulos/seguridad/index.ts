// Módulo seguridad (ADR-0001): usuarios, roles y sesiones.
// Las sesiones (refresh_token) y los eventos de acceso son internos del módulo
// (SDD S1.1 §2.3, SDD S1.2-S1.7 §2.4).
export { COSTO_BCRYPT, compararPassword, hashPassword } from './password';
export { esquemaPassword, MENSAJES_PASSWORD } from './password.esquemas';
export { crearModuloAuth } from './auth.modulo';
export { crearAutenticar, sesionDe, type SesionUsuario } from './autenticar';
export { crearAutorizar, type Autorizar, type PermisoConcedido } from './autorizar';
export { ACCIONES, POLITICA, RECURSOS, type Accion, type Recurso } from './autorizacion.politica';
export { describirUsuarios } from './usuario.repositorio';
export { crearModuloUsuarios } from './usuarios.modulo';
export { SUFIJO_ADMIN, usernameDe, usernameNuevo } from './usuarios.servicio';
export {
  asegurarCuentaEstudiante,
  desactivarCuentaEstudiante,
  hashInicialEstudiante,
  passwordInicialEstudiante,
  type ResultadoCuenta,
} from './cuentas-estudiante';
