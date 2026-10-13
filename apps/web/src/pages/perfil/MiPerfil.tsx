import type { ReactNode } from 'react';
import { useUsuario } from '@/hooks';
import { Card, PageHeader, RolBadge } from '@/components/ui';
import { nombreSede } from '@/config/catalogos';
import { fechaHora } from '@/lib/formato';
import { FormClave } from '@/pages/publicas/CambiarClave';

/** P-05 · Mi perfil. */
export function MiPerfil() {
  const u = useUsuario();
  const datos: [string, ReactNode][] = [
    ['Nombre', u.nombre],
    [u.rol === 'ESTUDIANTE' || u.rol === 'EGRESADO' ? 'CI' : 'Usuario', u.usuario],
    ['Rol', <RolBadge key="rol" rol={u.rol} />],
    ['Sede', u.sedeId ? nombreSede(u.sedeId) : '—'],
    ['Correo', u.correo ?? '—'],
    ['Último acceso', fechaHora(u.ultimoAcceso)],
  ];
  return (
    <>
      <PageHeader titulo="Mi perfil" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Mis datos">
          <dl className="divide-y divide-slate-100 text-sm">
            {datos.map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="col-span-2 text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">Para corregir tus datos, acércate a Kardex.</p>
        </Card>
        <Card title="Cambiar contraseña">
          <FormClave onListo={() => undefined} />
        </Card>
      </div>
    </>
  );
}
