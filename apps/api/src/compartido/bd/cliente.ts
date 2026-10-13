import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from './generado/client';

export type ClienteBd = PrismaClient;

/** Lo que reciben los servicios públicos de otros módulos para sumarse a una transacción (ADR-0001, regla 3). */
export type TransaccionBd = Prisma.TransactionClient;

/**
 * Crea un cliente Prisma sobre el driver `pg`. No hay instancia global: quien
 * arranca la app (S0.7) decide su ciclo de vida, y los tests pueden apuntar a
 * otra base.
 */
export function crearClienteBd(url: string | undefined = process.env.DATABASE_URL): ClienteBd {
  if (!url) {
    throw new Error('Falta DATABASE_URL: no se puede crear el cliente de base de datos.');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
