import { z } from 'zod';
import { esquemaPagina, esquemaPaginacion } from '@/compartido/http';
import { ACCIONES_AUDITORIA, MODULOS_AUDITORIA } from './auditoria.esquemas';

// GET /auditoria (SDD S6.4 §2.2).

export const esquemaFiltrosAuditoria = z
  .object({
    usuarioId: z.coerce.number().int().min(1).optional(),
    modulo: z.enum(MODULOS_AUDITORIA).optional(),
    accion: z.enum(ACCIONES_AUDITORIA).optional(),
    /** Fechas en hora de La Paz, inclusivas. */
    desde: z.iso.date().optional(),
    hasta: z.iso.date().optional(),
    entidad: z.string().trim().min(1).max(40).optional(),
    entidadId: z.string().trim().min(1).max(40).optional(),
    ...esquemaPaginacion,
  })
  .refine((f) => !f.desde || !f.hasta || f.desde <= f.hasta, {
    message: '"desde" no puede ser posterior a "hasta"',
    path: ['desde'],
  })
  .refine((f) => !f.entidadId || f.entidad, { message: 'entidadId exige entidad', path: ['entidadId'] });

export type FiltrosAuditoria = z.output<typeof esquemaFiltrosAuditoria>;
export const esquemasConsultaAuditoria = { query: esquemaFiltrosAuditoria };

export const esquemaRegistroAuditoria = z
  .object({
    id: z.number().int(),
    fecha: z.iso.datetime(),
    usuario: z.object({ id: z.number().int(), usuario: z.string(), nombre: z.string() }).nullable(),
    accion: z.string(),
    modulo: z.string(),
    entidad: z.string().nullable(),
    entidadId: z.string().nullable(),
    antes: z.unknown().nullable(),
    despues: z.unknown().nullable(),
    ip: z.string().nullable(),
    userAgent: z.string().nullable(),
  })
  .meta({ id: 'RegistroAuditoria', description: 'Un evento de la bitácora.' });

export const esquemaPaginaAuditoria = esquemaPagina(esquemaRegistroAuditoria).meta({ id: 'PaginaAuditoria' });
export type RegistroAuditoria = z.infer<typeof esquemaRegistroAuditoria>;
