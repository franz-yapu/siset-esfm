import { useEffect, useRef, useState } from 'react';
import { Cargando } from '@/components/ui';

/** El reto lo da la API (ADR-0012): mismo origen que el resto de las llamadas. */
const URL_RETO = `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/captcha`;

/**
 * Captcha ALTCHA del login (ADR-0012): "No soy un robot" que resuelve una prueba de trabajo en el navegador. El widget
 * se carga solo cuando hace falta (`import()`), para no pesar en el resto del sistema. Avisa la solución, o null si
 * todavía no está o venció.
 */
export function Captcha({ onCambio }: { onCambio: (solucion: string | null) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    void Promise.all([import('altcha'), import('altcha/i18n/es-419')]).then(() => vigente && setListo(true));
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const alCambiar = (e: Event) => {
      const { state, payload } = (e as CustomEvent<{ state: string; payload?: string }>).detail;
      onCambio(state === 'verified' && payload ? payload : null);
    };
    el.addEventListener('statechange', alCambiar);
    return () => el.removeEventListener('statechange', alCambiar);
  }, [listo, onCambio]);

  if (!listo) return <Cargando />;
  return <altcha-widget ref={ref} challenge={URL_RETO} language="es-419" />;
}
