import type { Usuario } from '@/types';
import type { Pagina } from '@/types/pagina';
import type {
  CambiosUsuario,
  DatosCrearUsuario,
  EstadoUsuario,
  FiltrosUsuarios,
  UsuarioConPassword,
  UsuarioDetalle,
} from '@/types/usuarios';
import { auditar, copia, db } from '@/mocks/db';
import { CLAVE_DEMO, type UsuarioMock } from '@/mocks/usuarios';
import { SEDES } from '@/config/catalogos';
import { ahora, delay } from '@/lib/formato';
import { ErrorApi } from '@/lib/errores';
import { nombreCompletoDe, normalizarDatosUsuario, usuarioDe, validarDatosUsuario } from '@/lib/usuarios';
import { LATENCIA } from './_comun';
import type { ServicioUsuarios } from './usuarios.service';

// Mock con el contrato de la API de S1.8 (SDD S1.13 §2.3): mismos tipos,
// mismos códigos de error y misma paginación. La pantalla no sabe de dónde vienen los datos.

const MODULO = 'Usuarios';

/** Misma regla que la API (SDD S1.8 §2.5). */
const estadoDe = (u: UsuarioMock): EstadoUsuario =>
  !u.activo ? 'INACTIVO' : u.bloqueadoHasta && u.bloqueadoHasta > ahora() ? 'BLOQUEADO' : 'ACTIVO';

/** Arma el `UsuarioDetalle`. Una cuenta sin datos personales (estudiantes del seed) usa su usuario y su nombre. */
export const aDetalle = (u: UsuarioMock): UsuarioDetalle => {
  const nombres = u.nombres ?? u.nombre;
  const apellidoPaterno = u.nombres ? (u.apellidoPaterno ?? null) : null;
  const apellidoMaterno = u.nombres ? (u.apellidoMaterno ?? null) : null;
  return {
    id: u.id,
    usuario: u.usuario,
    ci: u.ci ?? u.usuario,
    complemento: u.complemento ?? '',
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    nombre: nombreCompletoDe({ nombres, apellidoPaterno, apellidoMaterno }),
    email: u.correo ?? null,
    celular: u.celular ?? null,
    rol: u.rol,
    sedeId: u.sedeId,
    activo: u.activo,
    estado: estadoDe(u),
    bloqueadoHasta: u.bloqueadoHasta ?? null,
    debeCambiarPassword: Boolean(u.debeCambiarClave),
    ultimoAcceso: u.ultimoAcceso ?? null,
  };
};

const noEncontrado = () => new ErrorApi('El usuario no existe.', 'NO_ENCONTRADO', 404);
const negocio = (mensaje: string, codigo: string) => new ErrorApi(mensaje, codigo, 422);
const validacion = (detalles: { ruta: string; mensaje: string }[]) =>
  new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, detalles);

const buscar = (id: number): UsuarioMock => {
  const u = db.usuarios.find((x) => x.id === id);
  if (!u) throw noEncontrado();
  return u;
};

/** Valida como la API y responde `VALIDACION` con `detalles` en su formato. */
const exigirValidos = (d: DatosCrearUsuario): void => {
  const errores = Object.entries(validarDatosUsuario(d));
  if (errores.length) throw validacion(errores.map(([c, mensaje]) => ({ ruta: `body.${c}`, mensaje })));
  if (!SEDES.some((s) => s.id === d.sedeId)) throw negocio('La sede indicada no existe.', 'SEDE_INEXISTENTE');
};

/** Sin un KARDEX activo nadie podría administrar el sistema (D-27, DEC-020 #4). */
const exigirOtroKardex = (u: UsuarioMock): void => {
  if (!u.activo || u.rol !== 'KARDEX') return;
  if (!db.usuarios.some((x) => x.id !== u.id && x.activo && x.rol === 'KARDEX'))
    throw negocio('El sistema no puede quedarse sin un Kardex activo.', 'ULTIMO_KARDEX');
};

const apellidoDe = (d: UsuarioDetalle): string => d.apellidoPaterno ?? d.apellidoMaterno ?? '';

const detalleCopia = (u: UsuarioMock): UsuarioDetalle => copia(aDetalle(u));

export const usuariosMock: ServicioUsuarios = {
  async listar(f: FiltrosUsuarios): Promise<Pagina<UsuarioDetalle>> {
    await delay(LATENCIA);
    const t = f.texto?.trim().toLowerCase();
    const filas = db.usuarios
      .map(aDetalle)
      .filter(
        (d) =>
          (!t || [d.usuario, d.ci, d.nombre].some((v) => v.toLowerCase().includes(t))) &&
          (!f.rol || d.rol === f.rol) &&
          (!f.sedeId || d.sedeId === f.sedeId) &&
          (!f.estado || d.estado === f.estado),
      )
      .sort(
        (a, b) =>
          apellidoDe(a).localeCompare(apellidoDe(b), 'es') || a.nombres.localeCompare(b.nombres, 'es') || a.id - b.id,
      );
    const desde = (f.pagina - 1) * f.porPagina;
    return {
      datos: copia(filas.slice(desde, desde + f.porPagina)),
      pagina: f.pagina,
      porPagina: f.porPagina,
      total: filas.length,
    };
  },

  async obtener(id: number): Promise<UsuarioDetalle> {
    await delay(LATENCIA);
    return detalleCopia(buscar(id));
  },

  /** RF-03 CA1, CA3: CI + complemento único; obliga a cambiar la contraseña en el primer ingreso. */
  async crear(datos: DatosCrearUsuario, actor: Usuario): Promise<UsuarioConPassword> {
    await delay(LATENCIA);
    const d = normalizarDatosUsuario(datos);
    exigirValidos(d);
    const usuario = usuarioDe(d.ci, d.complemento);
    if (db.usuarios.some((u) => u.usuario === usuario || (u.ci === d.ci && (u.complemento ?? '') === d.complemento)))
      throw new ErrorApi('Ya existe un usuario con ese CI.', 'USUARIO_EXISTENTE', 409);
    const nuevo: UsuarioMock = {
      id: Math.max(0, ...db.usuarios.map((u) => u.id)) + 1,
      usuario,
      ci: d.ci,
      complemento: d.complemento,
      nombres: d.nombres,
      apellidoPaterno: d.apellidoPaterno,
      apellidoMaterno: d.apellidoMaterno,
      nombre: nombreCompletoDe(d),
      celular: d.celular,
      rol: d.rol,
      sedeId: d.sedeId,
      activo: true,
      debeCambiarClave: true,
      ...(d.email ? { correo: d.email } : {}),
    };
    db.usuarios.push(nuevo);
    auditar(actor.nombre, MODULO, 'Crear usuario', usuario, null, { ...d });
    // En la demo, auth.mock acepta CLAVE_DEMO para toda cuenta nueva; la API genera una distinta (DEC-020 #2).
    return { usuario: detalleCopia(nuevo), passwordTemporal: CLAVE_DEMO };
  },

  /** Solo cambia lo enviado; el CI no se edita (DEC-020 #3). EDITAR guarda solo lo que cambió. */
  async editar(id: number, c: CambiosUsuario, actor: Usuario): Promise<UsuarioDetalle> {
    await delay(LATENCIA);
    if ('ci' in c || 'complemento' in c) throw validacion([{ ruta: 'body', mensaje: 'El CI no se edita.' }]);
    if (!Object.values(c).some((v) => v !== undefined))
      throw validacion([{ ruta: 'body', mensaje: 'Envíe al menos un campo para editar' }]);
    const u = buscar(id);
    const actual = aDetalle(u);
    const d = normalizarDatosUsuario({
      ci: actual.ci,
      complemento: actual.complemento,
      nombres: c.nombres ?? actual.nombres,
      apellidoPaterno: c.apellidoPaterno !== undefined ? c.apellidoPaterno : actual.apellidoPaterno,
      apellidoMaterno: c.apellidoMaterno !== undefined ? c.apellidoMaterno : actual.apellidoMaterno,
      email: c.email !== undefined ? c.email : actual.email,
      celular: c.celular !== undefined ? c.celular : actual.celular,
      rol: c.rol ?? (actual.rol as DatosCrearUsuario['rol']),
      sedeId: c.sedeId ?? actual.sedeId ?? 0,
    });
    exigirValidos(d);
    if (d.rol !== u.rol) {
      if (u.id === actor.id) throw negocio('No puede cambiar su propio rol.', 'OPERACION_SOBRE_SI_MISMO');
      if (u.rol === 'KARDEX') exigirOtroKardex(u);
    }

    const nuevo = {
      nombres: d.nombres,
      apellidoPaterno: d.apellidoPaterno,
      apellidoMaterno: d.apellidoMaterno,
      email: d.email,
      celular: d.celular,
      rol: d.rol,
      sedeId: d.sedeId,
    };
    const antes: Record<string, unknown> = {};
    const despues: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(nuevo)) {
      const previo = actual[k as keyof typeof nuevo];
      if (previo !== v) {
        antes[k] = previo;
        despues[k] = v;
      }
    }
    if (!Object.keys(despues).length) return detalleCopia(u);

    Object.assign(u, {
      nombres: d.nombres,
      apellidoPaterno: d.apellidoPaterno,
      apellidoMaterno: d.apellidoMaterno,
      nombre: nombreCompletoDe(d),
      celular: d.celular,
      rol: d.rol,
      sedeId: d.sedeId,
    });
    if (d.email) u.correo = d.email;
    else delete u.correo;
    auditar(actor.nombre, MODULO, 'Editar usuario', u.usuario, antes, despues);
    return detalleCopia(u);
  },

  /** RF-03 CA2: la baja es lógica, nunca DELETE. */
  async darDeBaja(id: number, actor: Usuario): Promise<UsuarioDetalle> {
    await delay(LATENCIA);
    if (id === actor.id) throw negocio('No puede darse de baja a sí mismo.', 'OPERACION_SOBRE_SI_MISMO');
    const u = buscar(id);
    if (!u.activo) throw negocio('El usuario ya está dado de baja.', 'ESTADO_SIN_CAMBIO');
    exigirOtroKardex(u);
    u.activo = false;
    auditar(actor.nombre, MODULO, 'Dar de baja usuario', u.usuario, { activo: true }, { activo: false });
    return detalleCopia(u);
  },

  async reactivar(id: number, actor: Usuario): Promise<UsuarioDetalle> {
    await delay(LATENCIA);
    const u = buscar(id);
    if (u.activo) throw negocio('El usuario ya está activo.', 'ESTADO_SIN_CAMBIO');
    u.activo = true;
    auditar(actor.nombre, MODULO, 'Reactivar usuario', u.usuario, { activo: false }, { activo: true });
    return detalleCopia(u);
  },

  /** RF-03 CA4: obliga a cambiarla en el siguiente ingreso y quita el bloqueo. */
  async restablecerPassword(id: number, actor: Usuario): Promise<UsuarioConPassword> {
    await delay(LATENCIA);
    const u = buscar(id);
    u.debeCambiarClave = true;
    delete u.bloqueadoHasta;
    db.intentos[u.usuario] = 0;
    auditar(actor.nombre, MODULO, 'Restablecer contraseña', u.usuario, null, { debeCambiarClave: true });
    return { usuario: detalleCopia(u), passwordTemporal: CLAVE_DEMO };
  },

  async desbloquear(id: number, actor: Usuario): Promise<UsuarioDetalle> {
    await delay(LATENCIA);
    const u = buscar(id);
    if (estadoDe(u) !== 'BLOQUEADO') throw negocio('El usuario no está bloqueado.', 'ESTADO_SIN_CAMBIO');
    const antes = { bloqueadoHasta: u.bloqueadoHasta };
    delete u.bloqueadoHasta;
    db.intentos[u.usuario] = 0;
    auditar(actor.nombre, MODULO, 'Desbloquear cuenta', u.usuario, antes, { bloqueadoHasta: null });
    return detalleCopia(u);
  },
};
