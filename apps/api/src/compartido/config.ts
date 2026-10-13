import { z } from 'zod';

const NIVELES_LOG = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CORS_ORIGEN: z
    .string()
    .default('http://localhost:5173')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(NIVELES_LOG).optional(),
  JSON_LIMITE: z.string().default('100kb'),
});

export interface Config {
  entorno: 'development' | 'test' | 'production';
  puerto: number;
  databaseUrl: string;
  corsOrigen: string[];
  trustProxy: number;
  nivelLog: (typeof NIVELES_LOG)[number];
  jsonLimite: string;
}

/**
 * Lee y valida la configuración del entorno (SDD S0.7 §2.2). Si algo falta o es
 * inválido, lanza un error que nombra las variables sin mostrar sus valores.
 */
export function cargarConfig(entorno: Record<string, string | undefined> = process.env): Config {
  const r = esquema.safeParse(entorno);
  if (!r.success) {
    const variables = [...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ');
    throw new Error(`Configuración inválida o incompleta: ${variables}. Revisá apps/api/.env.example.`);
  }
  const e = r.data;
  return {
    entorno: e.NODE_ENV,
    puerto: e.PORT,
    databaseUrl: e.DATABASE_URL,
    corsOrigen: e.CORS_ORIGEN,
    trustProxy: e.TRUST_PROXY,
    nivelLog: e.LOG_LEVEL ?? (e.NODE_ENV === 'test' ? 'silent' : 'info'),
    jsonLimite: e.JSON_LIMITE,
  };
}
