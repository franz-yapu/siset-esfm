import { useNavigate } from 'react-router';
import { ScrollText, UserCog } from 'lucide-react';
import { useUsuario } from '@/hooks';
import { useUsuarios } from '@/hooks/useUsuarios';
import type { EstadoUsuario } from '@/types/usuarios';
import { Button, GrillaKpi, KpiCard } from '@/components/ui';
import { Saludo } from './comun';

/** Cuántas cuentas hay en un estado: la API devuelve el total con una página de un solo usuario. */
const useTotal = (estado: EstadoUsuario) => useUsuarios({ estado, pagina: 1, porPagina: 1 }).data?.total ?? 0;

/**
 * Inicio del Administrador (DEC-054): administra usuarios y roles y mira la bitácora; no hace trámites. Los conteos
 * salen de usuariosService (API o mock).
 */
export function InicioAdmin() {
  const u = useUsuario();
  const nav = useNavigate();
  const activos = useTotal('ACTIVO');
  const bloqueados = useTotal('BLOQUEADO');
  const inactivos = useTotal('INACTIVO');

  return (
    <>
      <Saludo
        nombre={u.nombre}
        acciones={
          <>
            <Button variant="secondary" icon={ScrollText} onClick={() => nav('/bitacora')}>
              Bitácora
            </Button>
            <Button icon={UserCog} onClick={() => nav('/usuarios')}>
              Usuarios y roles
            </Button>
          </>
        }
      >
        {bloqueados > 0
          ? `${bloqueados} ${bloqueados === 1 ? 'cuenta bloqueada' : 'cuentas bloqueadas'} por intentos fallidos.`
          : 'Ninguna cuenta bloqueada por intentos fallidos.'}
      </Saludo>
      <GrillaKpi columnas={3}>
        <KpiCard titulo="Cuentas activas" valor={activos} to="/usuarios?estado=ACTIVO" />
        <KpiCard alerta titulo="Bloqueadas por intentos" valor={bloqueados} to="/usuarios?estado=BLOQUEADO" />
        <KpiCard titulo="Dadas de baja" valor={inactivos} to="/usuarios?estado=INACTIVO" />
      </GrillaKpi>
    </>
  );
}
