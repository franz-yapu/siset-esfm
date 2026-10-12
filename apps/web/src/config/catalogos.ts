import type { Sede, TipoTramite } from '@/types';

export const SEDES: Sede[] = [
  { id: 1, codigo: 'LA_PAZ', nombre: 'Sede Central La Paz' },
  { id: 2, codigo: 'ANCOCAGUA', nombre: 'UA Ancocagua (Pucarani)' },
];

export const nombreSede = (id: number | null | undefined): string => SEDES.find((s) => s.id === id)?.nombre ?? '—';
export const sedeCorta = (id: number | null | undefined): string => (id === 1 ? 'La Paz' : id === 2 ? 'Ancocagua' : '—');

export const ESPECIALIDADES = [
  'Educación Primaria Comunitaria Vocacional',
  'Matemática',
  'Comunicación y Lenguajes',
  'Ciencias Naturales: Biología-Geografía',
  'Educación Física y Deportes',
];

/** D-21: catálogo provisional de tipos de trámite. */
export const TIPOS_TRAMITE: TipoTramite[] = ['Historial académico', 'Copia legalizada', 'Certificación'];
