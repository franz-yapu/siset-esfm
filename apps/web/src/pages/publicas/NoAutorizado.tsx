import { Link } from 'react-router-dom';
import { FileQuestion, ShieldX } from 'lucide-react';
import { useAuth } from '@/hooks';
import { rutaInicio } from '@/config/permisos';

function Pantalla({
  codigo,
  titulo,
  texto,
  icono: Icono,
}: {
  codigo: string;
  titulo: string;
  texto: string;
  icono: typeof ShieldX;
}) {
  const { usuario } = useAuth();
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icono className="size-10" />
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-400">{codigo}</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{texto}</p>
      <Link
        to={usuario ? rutaInicio(usuario.rol) : '/login'}
        className="mt-6 rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-oscuro"
      >
        Volver a mi inicio
      </Link>
    </div>
  );
}

/** P-04 · Acceso denegado (403). */
export function NoAutorizado() {
  return (
    <Pantalla codigo="403" titulo="Acceso denegado" texto="No tienes permiso para ver esta sección." icono={ShieldX} />
  );
}

/** P-04 · No encontrado (404). */
export function NoEncontrado() {
  return (
    <Pantalla
      codigo="404"
      titulo="Página no encontrada"
      texto="La dirección que escribiste no existe o fue movida."
      icono={FileQuestion}
    />
  );
}
