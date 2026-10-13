import type { ModuloHttp } from '@/compartido/http';
import { crearControladorSalud } from './salud.controlador';
import { crearRepositorioSalud, type BdSalud } from './salud.repositorio';
import { crearRutasSalud, openapiSalud } from './salud.rutas';
import { crearServicioSalud } from './salud.servicio';

/** Módulo salud: `GET /api/v1/health`. Es la plantilla de módulo HTTP (SDD S0.7 §2.9). */
export function crearModuloSalud(deps: { bd: BdSalud; version: string }): ModuloHttp {
  const servicio = crearServicioSalud(crearRepositorioSalud(deps.bd), deps.version);
  return { router: crearRutasSalud(crearControladorSalud(servicio)), openapi: openapiSalud };
}
