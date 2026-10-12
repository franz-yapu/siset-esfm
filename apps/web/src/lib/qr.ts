/** URL pública a la que apunta el QR de la hoja de ruta (RF-08 CA3). */
export const urlSeguimiento = (nro: string): string => {
  const base = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, '');
  return `${base}/seguimiento?hr=${encodeURIComponent(nro)}`;
};
