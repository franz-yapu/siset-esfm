import { Link } from 'react-router';
import { BookOpen, Code2, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PaginaGuia } from './comun';
import { guiasDeTesis } from './visibilidad';

interface Guia {
  ruta: string;
  titulo: string;
  texto: string;
  icono: LucideIcon;
}

const MANUAL: Guia = {
  ruta: '/guia/manual',
  titulo: 'Manual del personal y capacitación',
  texto: 'Cómo usar SISET en cada puesto, preguntas frecuentes y el plan de capacitación antes del piloto.',
  icono: BookOpen,
};

/** Solo en el entorno de prueba y la demo: material de estudio del autor, no del personal (DEC-048). */
const DE_TESIS: Guia[] = [
  {
    ruta: '/guia/estudio',
    titulo: 'Guía de estudio del código',
    texto:
      'Dónde está cada parte en el código: el hash de contraseñas, la sesión, los permisos, la bitácora, las notificaciones…',
    icono: Code2,
  },
  {
    ruta: '/guia/defensa',
    titulo: 'Preguntas de tutores y tribunal',
    texto: 'Preguntas probables sobre SISET, con respuestas cortas y dónde está la evidencia.',
    icono: GraduationCap,
  },
];

/** P-05 · Índice de guías, público (DEC-048). */
export function IndiceGuias() {
  const guias = guiasDeTesis() ? [MANUAL, ...DE_TESIS] : [MANUAL];
  return (
    <PaginaGuia titulo="Guías de SISET" subtitulo="Material de uso y de estudio del sistema." apartados={[]}>
      <div className="grid gap-4 sm:grid-cols-2">
        {guias.map((g) => (
          <Link
            key={g.ruta}
            to={g.ruta}
            className="flex gap-4 rounded-[10px] border border-borde bg-white p-5 transition-colors hover:border-acento"
          >
            <g.icono className="size-8 shrink-0 text-acento" aria-hidden />
            <span>
              <span className="block font-semibold text-tinta">{g.titulo}</span>
              <span className="mt-1 block text-sm text-suave">{g.texto}</span>
            </span>
          </Link>
        ))}
      </div>
    </PaginaGuia>
  );
}
