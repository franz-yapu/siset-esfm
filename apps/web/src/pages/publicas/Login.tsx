import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import clsx from 'clsx';
import { BookOpen, ChevronDown, Eye, EyeOff, LogIn, QrCode, Route } from 'lucide-react';
import { useAuth } from '@/hooks';
import { Alerta, Button, Input, RolBadge } from '@/components/ui';
import { rutaInicio } from '@/config/permisos';
import type { Usuario } from '@/types';
import type { MotivoCierre } from '@/context/AuthContext';
import { ErrorApi } from '@/lib/errores';
import { authService } from '@/services/auth.service';
import { consultaPermisos, type MisPermisos } from '@/services/permisos.service';
import { puedeVolverA } from '@/lib/permisos';
import { todoMock } from '@/services/_modo';
import { CUENTAS_PRUEBA, mostrarCuentasPrueba, PASSWORD_PRUEBA } from '@/config/cuentas-prueba';
import { COMPILACION, VERSION } from '@/config/version';
import { guiasDeTesis } from '@/pages/guias/visibilidad';
import { CAMINO } from '@/config/camino-tramite';
import { INSTITUCION, NOMBRE_ESCUELA } from '@/config/institucion';

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
  const queryClient = useQueryClient();
  // Volver a donde se estaba solo si a quien entra le corresponde: puede ser otra cuenta que la de la sesión vencida.
  // Los permisos ya están en caché: el login los trae antes de resolver.
  const destino = (u: Usuario) => {
    if (u.debeCambiarClave) return '/cambiar-clave';
    const permisos = queryClient.getQueryData<MisPermisos>(consultaPermisos(u).queryKey)?.permisos ?? [];
    return desde && puedeVolverA(permisos, desde) ? desde : rutaInicio(u.rol);
  };
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
    <div className="grid min-h-screen bg-fondo lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* La escuela, el sistema y el camino que sigue cada hoja de ruta entre las dos sedes, sobre el azul. */}
      <div className="flex flex-col gap-8 bg-primario px-6 py-6 text-white sm:px-10 lg:justify-between lg:p-12">
        <div className="flex items-start gap-2 text-sm text-sky-100">
          <Route className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            {INSTITUCION}
            <span className="block font-medium text-white">{NOMBRE_ESCUELA}</span>
          </p>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold">SISET</h1>
          <p className="mt-2 text-lg text-sky-100">Sistema de Gestión y Seguimiento de Trámites</p>
          <ol className="mt-10 hidden lg:block" aria-label="El camino de un trámite">
            {CAMINO.map((p, i) => (
              <li key={p.paso} className="flex gap-3">
                <span className="flex flex-col items-center" aria-hidden>
                  <span
                    className={clsx(
                      'mt-1.5 size-2.5 shrink-0 rounded-full',
                      i === 0 || i === CAMINO.length - 1 ? 'bg-white' : 'border-[1.5px] border-sky-200 bg-primario',
                    )}
                  />
                  {i < CAMINO.length - 1 && <span className="w-px flex-1 bg-white/25" />}
                </span>
                <span className="pb-4">
                  <span className="block text-sm font-medium text-white">{p.paso}</span>
                  <span className="block text-[13px] text-sky-100">{p.donde}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="hidden text-xs text-sky-100 lg:block">
          Unidad Académica Ancocagua · Pucarani
          <span className="ml-2 font-mono text-[11px] text-sky-200/80" title={`Compilación ${COMPILACION}`}>
            {VERSION}
          </span>
        </p>
      </div>

      <div className="flex justify-center px-4 py-8 sm:py-10 lg:items-center">
        <div className="w-full max-w-sm">
          <form onSubmit={enviar} className="rounded-[10px] border border-borde bg-white p-6" noValidate>
            <h2 className="mb-5 text-lg font-semibold text-tinta">Iniciar sesión</h2>
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
                  className="absolute top-[30px] right-1.5 rounded p-1 text-suave hover:text-tinta"
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
            className="mt-4 flex items-center gap-3 rounded-[10px] border border-borde bg-white p-4 text-sm font-medium text-primario transition-colors hover:border-acento hover:bg-acento-palido"
          >
            <QrCode className="size-7 shrink-0 text-acento" strokeWidth={1.5} />
            ¿Eres egresado? Consulta tu trámite sin iniciar sesión
          </Link>

          <Link to="/guia" className="mt-3 flex items-center justify-center gap-2 text-sm text-acento hover:underline">
            <BookOpen className="size-4" aria-hidden />
            {guiasDeTesis() ? 'Guías: manual del personal y material de estudio' : 'Manual del personal'}
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
    <div className="mt-4 rounded-[10px] border border-borde bg-white text-sm">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between px-4 py-3 font-medium text-tinta"
      >
        Usuarios de prueba <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="border-t border-borde px-2 pb-2">
          {aviso && <p className="px-2 pt-2 text-[13px] text-suave">{aviso}</p>}
          <p className="px-2 py-2 text-[13px] text-suave">
            Contraseña de todos: <code className="font-mono font-medium text-tinta">{password}</code>. Clic en una fila
            para autocompletar.
          </p>
          <ul>
            {cuentas.map((c) => (
              <li key={c.usuario}>
                <button
                  type="button"
                  onClick={() => onElegir(c.usuario, password)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-activo"
                >
                  <span className="min-w-0">
                    <code className="font-mono text-tinta">{c.usuario}</code>
                    {c.detalle && <span className="block truncate text-xs text-suave">{c.detalle}</span>}
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
