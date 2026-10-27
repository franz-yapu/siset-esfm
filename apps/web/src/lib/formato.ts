import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/** Simula la latencia de la API real. */
export const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const pad = (n: number): string => String(n).padStart(2, '0');

/** Fecha/hora local en formato `aaaa-mm-ddThh:mm` (sin zona: el prototipo vive en America/La_Paz). */
export const aIso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const ahora = (): string => aIso(new Date());
export const hoy = (): string => ahora().slice(0, 10);

/** Fecha relativa a hoy, para que los datos de demo siempre se vean recientes. */
export const haceDias = (dias: number, hora = '09:00'): string => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const [h, m] = hora.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return aIso(d);
};

export const fecha = (iso?: string): string => (iso ? format(parseISO(iso), 'dd/MM/yyyy', { locale: es }) : '—');
export const fechaHora = (iso?: string): string =>
  iso ? format(parseISO(iso), 'dd/MM/yyyy HH:mm', { locale: es }) : '—';
export const fechaLarga = (iso: string): string => format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
export const mesCorto = (iso: string): string => format(parseISO(iso), 'MMM yyyy', { locale: es });

export const diasDesde = (iso: string): number => differenceInCalendarDays(new Date(), parseISO(iso));

export const diasTexto = (n: number): string => (n === 0 ? 'Hoy' : n === 1 ? '1 día' : `${n} días`);

/** 1.er, 2.º, 3.er, 4.º, 5.º (año de formación). */
export const ordinal = (n: number): string => `${n}.${n === 1 || n === 3 ? 'er' : 'º'}`;

export const iniciales = (nombre: string): string =>
  nombre
    .replace(/^(Lic|Ing|Dr|Prof)\.\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const primerNombre = (nombre: string): string => nombre.replace(/^(Lic|Ing|Dr|Prof)\.\s*/i, '').split(' ')[0];

/**
 * "Buenos días" de 5:00 a 11:59, "Buenas tardes" de 12:00 a 18:59 y "Buenas noches" el resto, en la hora de Bolivia
 * (UTC−4, sin horario de verano), aunque el equipo tenga otra zona (observación #13 del tutor, SDD OBS-T1).
 */
export function saludoDeLaHora(ahora: Date = new Date()): string {
  const hora = (ahora.getUTCHours() + 24 - 4) % 24;
  if (hora >= 5 && hora < 12) return 'Buenos días';
  if (hora >= 12 && hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
