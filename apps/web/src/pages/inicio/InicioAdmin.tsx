import { Link } from 'react-router';
import { Lock, ScrollText, UserCheck, UserCog, UserX } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useUsuarios } from '@/hooks/useUsuarios';
import type { EstadoUsuario } from '@/types/usuarios';
import { KpiCard } from '@/components/ui';
import { GrillaKpi, Saludo } from './comun';

const ACCESOS = [
  { to: '/usuarios', texto: 'Usuarios y roles', icono: UserCog },
  { to: '/bitacora', texto: 'Bitácora', icono: ScrollText },
];

/** Cuántas cuentas hay en un estado: la API devuelve el total con una página de un solo usuario. */
const useTotal = (estado: EstadoUsuario) => useUsuarios({ estado, pagina: 1, porPagina: 1 }).data?.total ?? 0;

/**
 * Inicio del Administrador (DEC-054): administra usuarios y roles y mira la bitácora; no hace trámites. Los conteos
 * salen de usuariosService (API o mock).
 */
export function InicioAdmin() {
  const u = useUsuario();
  const activos = useTotal('ACTIVO');
  const bloqueados = useTotal('BLOQUEADO');
  const inactivos = useTotal('INACTIVO');

  return (
    <>
      <Saludo nombre={u.nombre}>Administrador del sistema · usuarios, roles y bitácora</Saludo>
      <GrillaKpi>
        <KpiCard titulo="Cuentas activas" valor={activos} icono={UserCheck} to="/usuarios?estado=ACTIVO" />
        <KpiCard
          titulo="Bloqueadas por intentos"
          valor={bloqueados}
          icono={Lock}
          color="rojo"
          to="/usuarios?estado=BLOQUEADO"
        />
        <KpiCard titulo="Dadas de baja" valor={inactivos} icono={UserX} color="ambar" to="/usuarios?estado=INACTIVO" />
      </GrillaKpi>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        {ACCESOS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-acento hover:text-acento"
          >
            <a.icono className="size-4 shrink-0" />
            {a.texto}
          </Link>
        ))}
      </div>
    </>
  );
}
