// Módulo personas (ADR-0001, enmienda): datos personales. Lo que necesitan el login
// (SDD S1.3 §2.5) y la API de usuarios (SDD S1.8 §2.4); rutas propias llegan con S2.x.
export {
  actualizarPersona,
  buscarIdsPorNombre,
  buscarNombreCompleto,
  buscarNombresCompletos,
  buscarPersonaPorCi,
  crearPersona,
  obtenerPersonas,
  type CambiosPersona,
  type DatosPersona,
  type Persona,
} from './persona.repositorio';
