/** Respuesta paginada de la API (DEC-017). La usan usuarios (S1.13) y bitácora (S6.5). */
export interface Pagina<T> {
  datos: T[];
  pagina: number;
  porPagina: number;
  total: number;
}
