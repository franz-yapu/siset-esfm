import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Rol } from '@/types';
import { rutaInicio } from '@/config/permisos';

const NOMBRES: Record<string, string> = {
  'mi-file': 'Mi file académico', 'mis-tramites': 'Mis trámites', 'hojas-ruta': 'Hojas de ruta', nueva: 'Nueva',
  caratula: 'Carátula', pases: 'Bandeja de pases', entregas: 'Firma y entrega', files: 'Files académicos',
  revision: 'Revisión de trámites', dictamenes: 'Dictámenes', emision: 'Emisión de documentos', 'carga-masiva': 'Carga masiva',
  reportes: 'Reportes', usuarios: 'Usuarios', bitacora: 'Bitácora', perfil: 'Mi perfil', editar: 'Editar',
};

const INICIOS = ['estudiante', 'egresado', 'sec-dir', 'sec-coord', 'coordinador', 'kardex'];

export function Breadcrumb({ rol }: { rol: Rol }) {
  const { pathname } = useLocation();
  const partes = pathname.split('/').filter(Boolean);
  if (partes.length === 1 && INICIOS.includes(partes[0])) return null;
  const migas = partes.map((p, i) => ({
    etiqueta: NOMBRES[p] ?? (p === 'nuevo' ? (partes[0] === 'files' ? 'Nuevo file' : 'Nuevo') : /^\d+$/.test(p) ? 'Detalle' : decodeURIComponent(p)),
    to: '/' + partes.slice(0, i + 1).join('/'),
  }));
  return (
    <nav aria-label="Ruta de navegación" className="no-print mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link to={rutaInicio(rol)} className="hover:text-acento">Inicio</Link>
      {migas.map((m, i) => (
        <span key={m.to} className="flex items-center gap-1">
          <ChevronRight className="size-3" aria-hidden />
          {i === migas.length - 1 ? <span className="text-slate-700">{m.etiqueta}</span> : <Link to={m.to} className="hover:text-acento">{m.etiqueta}</Link>}
        </span>
      ))}
    </nav>
  );
}
