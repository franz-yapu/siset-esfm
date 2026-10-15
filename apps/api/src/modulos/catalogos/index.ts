// Módulo catalogos (ADR-0001): sedes, especialidades y parámetros. La lectura de parámetros del login
// (SDD S1.4 §2.2) y las especialidades de files (SDD S2.2).
export { leerParametroEntero, leerParametrosEnteros, type ClaveParametro } from './parametro.repositorio';
export { nombreEspecialidadActiva, nombresEspecialidades } from './especialidad.repositorio';
export { crearModuloCatalogos } from './catalogos.modulo';
export { obtenerRequisitosActivos, type RequisitoCatalogo } from './requisito.repositorio';
export { obtenerSedes, obtenerTiposTramite } from './tramite.repositorio';
