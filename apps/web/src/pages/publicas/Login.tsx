import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ChevronDown, Eye, EyeOff, LogIn, QrCode, Route } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Alerta, Button, Input, RolBadge } from '@/components/ui';
import { rutaInicio } from '@/config/permisos';
import type { Usuario } from '@/types';
import type { MotivoCierre } from '@/context/AuthContext';
import { ErrorApi } from '@/lib/errores';
import { authService } from '@/services/auth.service';
import { todoMock } from '@/services/_modo';
import { CUENTAS_PRUEBA, mostrarCuentasPrueba, PASSWORD_PRUEBA } from '@/config/cuentas-prueba';

/** La demo (usuarios de prueba, "Ver como", reinicio) solo existe con todos los servicios en mock (SDD S0.8 §2.5). */
const DEMO = import.meta.env.VITE_DEMO === 'true' && todoMock();

/** El despliegue de prueba publica sus cuentas debajo del login (SDD S0.12 §2.5); producción no. */
const CUENTAS = mostrarCuentasPrueba(import.meta.env.VITE_CUENTAS_PRUEBA);

/** Tras un 401 se avisa del bloqueo sin números ni decir si pasó: la API no lo revela (DEC-013, SDD S1.9 §2.1). */
const AVISO_BLOQUEO =
  'Varios intentos fallidos seguidos bloquean la cuenta por un tiempo. Si no puedes entrar, acércate a Kardex.';

const MENSAJE_CIERRE: Record<MotivoCierre, string> = {
  INACTIVIDAD: 'Tu sesión se cerró tras 15 minutos sin actividad. Vuelve a ingresar.',
  SESION_VENCIDA: 'Tu sesión terminó. Vuelve a ingresar.',
};

/** Ruta interna de la que vino el usuario (la pone ProtectedRoute), o null (SDD S1.10 §2.7). */
const rutaDeOrigen = (estado: unknown): string | null => {
  const desde = typeof estado === 'object' && estado !== null ? (estado as Record<string, unknown>).desde : null;
  return typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//') && desde !== '/login'
    ? desde
    : null;
};

/** P-01 · Login (CI o usuario + contraseña). */
export function Login() {
  const { usuario, login, motivoCierre } = useAuth();
  const nav = useNavigate();
  const desde = rutaDeOrigen(useLocation().state);
  const destino = (u: Usuario) => (u.debeCambiarClave ? '/cambiar-clave' : (desde ?? rutaInicio(u.rol)));
  const [escribio, setEscribio] = useState(false);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState<{ mensaje: string; avisoBloqueo: boolean } | null>(null);
  const [cargando, setCargando] = useState(false);

  if (usuario) return <Navigate to={destino(usuario)} replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user.trim() || !password) {
      setError({ mensaje: 'Ingresa tu CI o usuario y tu contraseña', avisoBloqueo: false });
      return;
    }
    setCargando(true);
    try {
      const u = await login(user, password);
      nav(destino(u), { replace: true });
    } catch (err) {
      setPassword('');
      setError({
        mensaje: err instanceof Error ? err.message : 'Error al ingresar',
        avisoBloqueo: err instanceof ErrorApi && err.codigo === 'CREDENCIALES_INVALIDAS',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primario p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-sm text-sky-100">
          <Route className="size-5" />
          ESFM “Mcal. Andrés de Santa Cruz y Calahumana”
        </div>
        <div>
          <h1 className="text-4xl font-semibold">SISET</h1>
          <p className="mt-2 text-lg text-sky-100">Sistema de Gestión y Seguimiento de Trámites</p>
          <p className="mt-8 max-w-md text-2xl leading-snug font-light">
            Seguimiento de trámites en línea, de La Paz a Ancocagua.
          </p>
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
              {motivoCierre && !escribio && !error && <Alerta tipo="info">{MENSAJE_CIERRE[motivoCierre]}</Alerta>}
              <Input
                label="CI o usuario"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setEscribio(true);
                }}
                autoComplete="username"
                autoFocus
                inputMode="text"
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={ver ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setVer(!ver)}
                  className="absolute top-7 right-2 rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {error && (
                <Alerta tipo="error">
                  {error.mensaje}
                  {error.avisoBloqueo && <p className="mt-1 text-xs">{AVISO_BLOQUEO}</p>}
                </Alerta>
              )}
              <Button type="submit" loading={cargando} icon={LogIn} className="w-full">
                Ingresar
              </Button>
            </div>
          </form>

          <Link
            to="/seguimiento"
            className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-acento/40 bg-sky-50 p-4 text-sm font-medium text-primario hover:border-acento"
          >
            <QrCode className="size-8 shrink-0 text-acento" />
            ¿Eres egresado? Consulta tu trámite sin iniciar sesión
          </Link>

          {(DEMO || CUENTAS) && (
            <UsuariosPrueba
              cuentas={
                DEMO
                  ? authService.usuariosDemo().map((u) => ({ usuario: u.usuario, rol: u.rol, detalle: null }))
                  : CUENTAS_PRUEBA.map((c) => ({ usuario: c.usuario, rol: c.rol, detalle: `${c.nombre} · ${c.sede}` }))
              }
              password={DEMO ? 'demo123' : PASSWORD_PRUEBA}
              aviso={
                DEMO
                  ? null
                  : 'Entorno de prueba con datos ficticios. Los estudiantes no inician sesión: consultan su trámite en "¿Eres egresado?".'
              }
              onElegir={(u, clave) => {
                setUser(u);
                setPassword(clave);
                setError(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface CuentaVisible {
  usuario: string;
  rol: Usuario['rol'];
  detalle: string | null;
}

/** Recuadro plegable con los usuarios de prueba: los de la demo o los del despliegue de prueba. */
function UsuariosPrueba({
  cuentas,
  password,
  aviso,
  onElegir,
}: {
  cuentas: CuentaVisible[];
  password: string;
  aviso: string | null;
  onElegir: (usuario: string, password: string) => void;
}) {
  const [abierto, setAbierto] = useState(!DEMO);
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 text-sm">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between px-4 py-3 font-medium text-amber-900"
      >
        Usuarios de prueba <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="border-t border-amber-200 px-2 pb-2">
          {aviso && <p className="px-2 pt-2 text-xs text-amber-800">{aviso}</p>}
          <p className="px-2 py-2 text-xs text-amber-800">
            Contraseña de todos: <code className="font-semibold">{password}</code>. Clic en una fila para autocompletar.
          </p>
          <ul>
            {cuentas.map((c) => (
              <li key={c.usuario}>
                <button
                  type="button"
                  onClick={() => onElegir(c.usuario, password)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-amber-100"
                >
                  <span className="min-w-0">
                    <code className="text-slate-800">{c.usuario}</code>
                    {c.detalle && <span className="block truncate text-xs text-slate-600">{c.detalle}</span>}
                  </span>
                  <RolBadge rol={c.rol} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
