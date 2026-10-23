/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO?: string;
  /** 'true' solo en el despliegue de prueba: cuentas debajo del login y noindex (SDD S0.12 §2.5). */
  readonly VITE_CUENTAS_PRUEBA?: string;
  readonly VITE_PUBLIC_URL?: string;
  /** 'false' (default) | 'true' | lista de servicios: 'auth,files' (SDD S0.8 §2.3). */
  readonly VITE_USAR_API?: string;
  /** Vacío → '/api/v1' (proxy de Vite en desarrollo, Nginx en producción). */
  readonly VITE_API_URL?: string;
  /** La de apps/web/package.json; la pone vite.config.ts. */
  readonly VITE_VERSION: string;
  /** Etiqueta de la imagen desplegada (AAAA.MM.DD-commit), para comprobar qué build está publicado. */
  readonly VITE_COMPILACION?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
