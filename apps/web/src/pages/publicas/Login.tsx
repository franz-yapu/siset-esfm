import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, LogIn, QrCode, Route } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Alerta, Button, Input, RolBadge } from '@/components/ui';
import { rutaInicio } from '@/config/permisos';
import { authService } from '@/services/auth.service';

const DEMO = import.meta.env.VITE_DEMO === 'true';

/** P-01 · Login (CI o usuario + contraseña). */
export function Login() {
  const { usuario, login } = useAuth();
  const nav = useNavigate();
  const [user, setUser] = useState('');
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (usuario) return <Navigate to={usuario.debeCambiarClave ? '/cambiar-clave' : rutaInicio(usuario.rol)} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user.trim() || !clave) { setError('Ingresa tu CI o usuario y tu contraseña'); return; }
    setCargando(true);
    try {
      const u = await login(user, clave);
      nav(u.debeCambiarClave ? '/cambiar-clave' : rutaInicio(u.rol), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al ingresar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primario p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-sm text-sky-100"><Route className="size-5" />ESFM “Mcal. Andrés de Santa Cruz y Calahumana”</div>
        <div>
          <h1 className="text-4xl font-semibold">SISET</h1>
          <p className="mt-2 text-lg text-sky-100">Sistema de Gestión y Seguimiento de Trámites</p>
          <p className="mt-8 max-w-md text-2xl leading-snug font-light">Seguimiento de trámites en línea, de La Paz a Ancocagua.</p>
        </div>
        <p className="text-xs text-sky-200">Unidad Académica Ancocagua · Pucarani</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <h1 className="text-2xl font-semibold text-primario">SISET</h1>
            <p className="text-sm text-slate-500">Seguimiento de trámites · UA Ancocagua</p>
          </div>
          <form onSubmit={enviar} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" noValidate>
            <h2 className="mb-5 text-lg font-semibold text-slate-900">Iniciar sesión</h2>
            <div className="space-y-4">
              <Input label="CI o usuario" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus inputMode="text" />
              <div className="relative">
                <Input label="Contraseña" type={ver ? 'text' : 'password'} value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setVer(!ver)} className="absolute top-7 right-2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}>{ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
              {error && <Alerta tipo="error">{error}</Alerta>}
              <Button type="submit" loading={cargando} icon={LogIn} className="w-full">Ingresar</Button>
            </div>
          </form>

          <Link to="/seguimiento" className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-acento/40 bg-sky-50 p-4 text-sm font-medium text-primario hover:border-acento">
            <QrCode className="size-8 shrink-0 text-acento" />
            ¿Eres egresado? Consulta tu trámite sin iniciar sesión
          </Link>

          {DEMO && <UsuariosPrueba onElegir={(u) => { setUser(u); setClave('demo123'); setError(null); }} />}
        </div>
      </div>
    </div>
  );
}

/** Recuadro plegable con los usuarios de prueba (solo demo). */
function UsuariosPrueba({ onElegir }: { onElegir: (usuario: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 text-sm">
      <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto}
        className="flex w-full items-center justify-between px-4 py-3 font-medium text-amber-900">
        Usuarios de prueba <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="border-t border-amber-200 px-2 pb-2">
          <p className="px-2 py-2 text-xs text-amber-800">Contraseña de todos: <code className="font-semibold">demo123</code>. Clic en una fila para autocompletar.</p>
          <ul>
            {authService.usuariosDemo().map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => onElegir(u.usuario)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-amber-100">
                  <code className="text-slate-800">{u.usuario}</code><RolBadge rol={u.rol} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
