// Módulo hojas-ruta (ADR-0001): trámites de egresados con dos flujos según el valorado (DEC-033, DEC-034, ADR-0005).
// La ingesta y el correlativo llegan con S3.4 y S3.2.
export { crearModuloHojasRuta } from './hojas-ruta.modulo';
export { ACCIONES_HOJA_RUTA, ESTADOS_HOJA_RUTA, TRANSICIONES } from './maquina';
