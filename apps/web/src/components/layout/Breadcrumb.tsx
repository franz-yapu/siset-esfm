import { Link, useLocation } from 'react-router';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { Rol } from '@/types';
import { rutaInicio } from '@/config/permisos';

const NOMBRES: Record<string, string> = {
  'mi-file': 'Mi file académico',
  'mis-tramites': 'Mis trámites',
  'hojas-ruta': 'Hojas de ruta',
  nueva: 'Nueva',
  caratula: 'Carátula',
  pases: 'Bandeja de pases',
  entregas: 'Firma y entrega',
  files: 'Files académicos',
  revision: 'Recojo y remisión',
  firmas: 'Firmas',
  emision: 'Impresión',
  'carga-masiva': 'Carga masiva',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  bitacora: 'Bitácora',
  perfil: 'Mi perfil',
  editar: 'Editar',
  requisitos: 'Requisitos por modalidad',
  guias: 'Guías',
};

const INICIOS = ['estudiante', 'sec-dir', 'sec-coord', 'coordinador', 'kardex', 'admin'];

/** La ruta de la pantalla, en la barra superior. En el inicio de cada rol dice solo "Inicio". */
export function Breadcrumb({ rol, className }: { rol: Rol; className?: string }) {
  const { pathname } = useLocation();
  const partes = pathname.split('/').filter(Boolean);
  const esInicio = partes.length === 1 && INICIOS.includes(partes[0]!);
  const migas = (esInicio ? [] : partes).map((p, i) => ({
    etiqueta:
      NOMBRES[p] ??
      (p === 'nuevo'
        ? partes[0] === 'files'
          ? 'Nuevo file'
          : 'Nuevo'
        : /^\d+$/.test(p)
          ? 'Detalle'
          : decodeURIComponent(p)),
    to: '/' + partes.slice(0, i + 1).join('/'),
  }));
  return (
    <nav
      aria-label="Ruta de navegación"
      className={clsx('no-print min-w-0 items-center gap-1 truncate px-2 text-sm text-suave', className)}
    >
      {esInicio ? (
        <span className="text-tinta">Inicio</span>
      ) : (
        <Link to={rutaInicio(rol)} className="hover:text-tinta">
          Inicio
        </Link>
      )}
      {migas.map((m, i) => (
        <span key={m.to} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-control" aria-hidden />
          {i === migas.length - 1 ? (
            <span className="text-tinta">{m.etiqueta}</span>
          ) : (
            <Link to={m.to} className="hover:text-tinta">
              {m.etiqueta}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
