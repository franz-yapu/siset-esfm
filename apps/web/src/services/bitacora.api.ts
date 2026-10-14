import { api } from '@/lib/api';
import type { Pagina } from '@/types/pagina';
import type { FiltrosAuditoria, RegistroAuditoria, UsuarioBitacora } from '@/types/bitacora';

/** Lo que exponen el mock y la API de la bitácora (SDD S6.5 §2.1). */
export interface ServicioBitacora {
  /** RF-14: solo lectura. No hay funciones para editar ni borrar. */
  listar(f: FiltrosAuditoria, pagina: number, porPagina: number): Promise<Pagina<RegistroAuditoria>>;
  /** Buscador del filtro "Usuario" (hasta 10 resultados). */
  buscarUsuarios(texto: string): Promise<UsuarioBitacora[]>;
}

export const MAX_USUARIOS_BUSCADOR = 10;

/** Parámetros sin los vacíos: la API rechaza `modulo=` (SDD S6.4 §2.2). */
export function parametrosAuditoria(f: FiltrosAuditoria, pagina: number, porPagina: number): Record<string, string> {
  const p: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v !== undefined && v !== '') p[k] = String(v);
  }
  p.pagina = String(pagina);
  p.porPagina = String(porPagina);
  return p;
}

/** bitacoraService contra la API: GET /auditoria (S6.4) y GET /usuarios (S1.8). */
export const bitacoraApi: ServicioBitacora = {
  async listar(f, pagina, porPagina) {
    const { data } = await api.get<Pagina<RegistroAuditoria>>('/auditoria', {
      params: parametrosAuditoria(f, pagina, porPagina),
    });
    return data;
  },

  async buscarUsuarios(texto) {
    const { data } = await api.get<Pagina<UsuarioBitacora>>('/usuarios', {
      params: { texto: texto.trim(), porPagina: String(MAX_USUARIOS_BUSCADOR) },
    });
    return data.datos.map(({ id, usuario, nombre }) => ({ id, usuario, nombre }));
  },
};
