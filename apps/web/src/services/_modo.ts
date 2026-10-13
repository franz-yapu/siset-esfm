/** Servicios que pueden pasar de mock a API, uno por uno (SDD S0.8 §2.3). */
export type NombreServicio =
  'auth' | 'files' | 'hojasRuta' | 'pases' | 'dictamenes' | 'documentos' | 'reportes' | 'usuarios' | 'bitacora';

const leer = (valor: string | undefined): Set<string> | 'todos' => {
  const v = (valor ?? '').trim().toLowerCase();
  if (v === 'true') return 'todos';
  if (!v || v === 'false') return new Set();
  return new Set(v.split(',').map((s) => s.trim()));
};

/** VITE_USAR_API: 'false' (default) | 'true' (todos) | lista: 'auth,files'. */
export const usaApi = (servicio: NombreServicio, valor = import.meta.env.VITE_USAR_API): boolean => {
  const activos = leer(valor);
  return activos === 'todos' || activos.has(servicio.toLowerCase());
};

/** Ningún servicio usa la API: solo entonces existen la demo y su botón de reinicio. */
export const todoMock = (valor = import.meta.env.VITE_USAR_API): boolean => {
  const activos = leer(valor);
  return activos !== 'todos' && activos.size === 0;
};
