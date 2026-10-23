/** Versión que se muestra al pie: la de apps/web/package.json, p. ej. «v0.1.0». */
export const VERSION = `v${import.meta.env.VITE_VERSION}`;

/** La imagen publicada (AAAA.MM.DD-commit) que pone "Publicar imágenes"; en local, «desarrollo». Va en el tooltip. */
export const COMPILACION = import.meta.env.VITE_COMPILACION || 'desarrollo';
