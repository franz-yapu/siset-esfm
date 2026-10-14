import { z } from 'zod';

// Convención de paginación de la API (SDD S6.4 §2.2, DEC-017): ?pagina=&porPagina= →
// { datos, pagina, porPagina, total }. La reutilizan los listados de S1.8 y S2.2.

export const esquemaPaginacion = {
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(50),
};

export interface Pagina<T> {
  datos: T[];
  pagina: number;
  porPagina: number;
  total: number;
}

/** Esquema de respuesta paginada para OpenAPI. */
export const esquemaPagina = <T extends z.ZodType>(item: T) =>
  z.object({
    datos: z.array(item),
    pagina: z.number().int(),
    porPagina: z.number().int(),
    total: z.number().int(),
  });

/** `skip`/`take` de Prisma para una página. */
export const desplazamiento = ({ pagina, porPagina }: { pagina: number; porPagina: number }) => ({
  skip: (pagina - 1) * porPagina,
  take: porPagina,
});
