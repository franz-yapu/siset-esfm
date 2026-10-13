/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO?: string;
  readonly VITE_PUBLIC_URL?: string;
  /** 'false' (default) | 'true' | lista de servicios: 'auth,files' (SDD S0.8 §2.3). */
  readonly VITE_USAR_API?: string;
  /** Vacío → '/api/v1' (proxy de Vite en desarrollo, Nginx en producción). */
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
