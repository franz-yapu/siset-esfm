import { Prisma, type ClienteBd, type TransaccionBd } from '@/compartido/bd';
import { ErrorConflicto, ErrorNegocio, ErrorNoEncontrado, ErrorValidacion } from '@/compartido/errores';
import { desplazamiento, type Pagina } from '@/compartido/http';
import { registrarEvento } from '@/modulos/auditoria';
import { registrarDesbloqueo, registrarRestablecimientoPassword } from './eventos-acceso';
import { hashPassword } from './password';
import { generarPasswordTemporal } from './password-temporal';
import { revocarRefreshTokensDeUsuario } from './refresh-token.repositorio';
import {
  actualizarUsuario,
  bloquearCambiosDeAdmin,
  buscarRolId,
  buscarUsuarioDetalle,
  contarOtrosAdminActivos,
  crearUsuario,
  cuentasDePersona,
  listarUsuarios,
  type CambiosUsuario,
  type UsuarioDetalleBd,
} from './usuario.repositorio';
import type {
  CambiosUsuarioApi,
  DatosCrearUsuario,
  EstadoUsuario,
  FiltrosUsuarios,
  UsuarioDetalle,
} from './usuarios.esquemas';

type Cliente = ClienteBd | TransaccionBd;

/** Lo que seguridad necesita de personas; lo arma la raíz de composición (ADR-0001, SDD S1.8 §2.4). */
export interface PersonaUsuarios {
  id: number;
  ci: string;
  complemento: string;
  nombres: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  email: string | null;
  celular: string | null;
}

type DatosPersonales = Omit<PersonaUsuarios, 'id'>;
type CambiosPersonales = Partial<Omit<DatosPersonales, 'ci' | 'complemento'>>;

export interface PersonasParaUsuarios {
  buscarPersonaPorCi(cliente: Cliente, ci: string, complemento: string): Promise<PersonaUsuarios | null>;
  crearPersona(cliente: Cliente, datos: DatosPersonales): Promise<PersonaUsuarios>;
  actualizarPersona(cliente: Cliente, id: number, cambios: CambiosPersonales): Promise<PersonaUsuarios>;
  buscarIdsPorNombre(cliente: Cliente, texto: string): Promise<number[]>;
  obtenerPersonas(cliente: Cliente, ids: number[]): Promise<Map<number, PersonaUsuarios>>;
}

export interface DependenciasUsuarios {
  bd: ClienteBd;
  personas: PersonasParaUsuarios;
}

export interface UsuarioConPassword {
  usuario: UsuarioDetalle;
  passwordTemporal: string;
}

/** Nombre de usuario: el CI, con el complemento si lo hay (SDD S0.11 §2.4, D-25). */
export const usernameDe = (ci: string, complemento: string): string => (complemento ? `${ci}-${complemento}` : ci);

/** La segunda cuenta de una persona, la de Administrador, lleva este sufijo: `1234567-ADM` (DEC-063). */
export const SUFIJO_ADMIN = '-ADM';

/** Roles del personal que pueden sumar una cuenta de Administrador (DEC-063): no el estudiante ni el egresado. */
const ROLES_CON_CUENTA_ADMIN = new Set(['KARDEX', 'SEC_DIR', 'SEC_COORD', 'COORDINADOR']);

/**
 * El username de la cuenta nueva, o null si la persona no puede tener otra. Sin cuenta: el CI (con complemento). Con
 * una cuenta del personal que no es ADMIN: solo puede sumar la de Administrador, con `SUFIJO_ADMIN` (DEC-063).
 */
export function usernameNuevo(
  base: string,
  rol: string,
  cuentas: readonly { rol: { codigo: string } }[],
): string | null {
  if (cuentas.length === 0) return base;
  if (rol !== 'ADMIN' || cuentas.length > 1 || !ROLES_CON_CUENTA_ADMIN.has(cuentas[0].rol.codigo)) return null;
  return `${base}${SUFIJO_ADMIN}`;
}

const CAMPOS_PERSONALES = ['nombres', 'apellidoPaterno', 'apellidoMaterno', 'email', 'celular'] as const;

/** §2.5: inactivo gana a bloqueado; el bloqueo vencido ya no cuenta. */
const estadoDe = (u: { activo: boolean; bloqueadoHasta: Date | null }, ahora: Date): EstadoUsuario =>
  !u.activo ? 'INACTIVO' : u.bloqueadoHasta && u.bloqueadoHasta > ahora ? 'BLOQUEADO' : 'ACTIVO';

function whereDeEstado(estado: EstadoUsuario | undefined, ahora: Date): Prisma.UsuarioWhereInput {
  switch (estado) {
    case 'INACTIVO':
      return { activo: false };
    case 'BLOQUEADO':
      return { activo: true, bloqueadoHasta: { gt: ahora } };
    case 'ACTIVO':
      return { activo: true, OR: [{ bloqueadoHasta: null }, { bloqueadoHasta: { lte: ahora } }] };
    default:
      return {};
  }
}

const nombreCompleto = (p: PersonaUsuarios) =>
  [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');

function detalle(u: UsuarioDetalleBd, p: PersonaUsuarios, ahora = new Date()): UsuarioDetalle {
  return {
    id: u.id,
    usuario: u.username,
    ci: p.ci,
    complemento: p.complemento,
    nombres: p.nombres,
    apellidoPaterno: p.apellidoPaterno,
    apellidoMaterno: p.apellidoMaterno,
    nombre: nombreCompleto(p),
    email: p.email,
    celular: p.celular,
    rol: u.rol.codigo,
    sedeId: u.sedeId,
    activo: u.activo,
    estado: estadoDe(u, ahora),
    bloqueadoHasta: u.bloqueadoHasta?.toISOString() ?? null,
    debeCambiarPassword: u.debeCambiarPassword,
    ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null,
  };
}

const ordenEs = new Intl.Collator('es', { sensitivity: 'base' });
const compararPorApellido = (a: PersonaUsuarios, b: PersonaUsuarios) =>
  ordenEs.compare(a.apellidoPaterno ?? '', b.apellidoPaterno ?? '') ||
  ordenEs.compare(a.apellidoMaterno ?? '', b.apellidoMaterno ?? '') ||
  ordenEs.compare(a.nombres, b.nombres);

/** La única FK de usuario que llega del cliente es la sede: P2003 significa que no existe. */
async function conSedeValida<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      throw new ErrorNegocio('La sede indicada no existe.', 'SEDE_INEXISTENTE');
    }
    throw e;
  }
}

const sobreSiMismo = (mensaje: string) => new ErrorNegocio(mensaje, 'OPERACION_SOBRE_SI_MISMO');
const sinCambio = (mensaje: string) => new ErrorNegocio(mensaje, 'ESTADO_SIN_CAMBIO');

/**
 * API de usuarios del personal (SDD S1.8). Solo la usa ADMIN (DEC-054) (la ruta ya pasó por
 * `autorizar`). Cada escritura deja su evento en la misma transacción (DEC-007).
 */
export function crearServicioUsuarios({ bd, personas }: DependenciasUsuarios) {
  async function cargar(cliente: Cliente, id: number) {
    const u = await buscarUsuarioDetalle(cliente, id);
    if (!u) throw new ErrorNoEncontrado('El usuario no existe.');
    const p = (await personas.obtenerPersonas(cliente, [u.personaId])).get(u.personaId);
    if (!p) throw new Error(`El usuario ${id} no tiene persona.`);
    return { u, p };
  }

  /** Sin un ADMIN activo nadie podría administrar el sistema (DEC-020 #4, DEC-054). */
  async function exigirOtroAdmin(tx: TransaccionBd, u: UsuarioDetalleBd) {
    if (!u.activo || u.rol.codigo !== 'ADMIN') return;
    if ((await contarOtrosAdminActivos(tx, u.id)) === 0) {
      throw new ErrorNegocio('El sistema no puede quedarse sin un Administrador activo.', 'ULTIMO_ADMIN');
    }
  }

  return {
    async listar(filtros: FiltrosUsuarios): Promise<Pagina<UsuarioDetalle>> {
      const ahora = new Date();
      const where: Prisma.UsuarioWhereInput[] = [whereDeEstado(filtros.estado, ahora)];
      if (filtros.rol) where.push({ rol: { codigo: filtros.rol } });
      if (filtros.sedeId) where.push({ sedeId: filtros.sedeId });
      if (filtros.texto) {
        const ids = await personas.buscarIdsPorNombre(bd, filtros.texto);
        where.push({
          OR: [{ username: { contains: filtros.texto, mode: 'insensitive' } }, { personaId: { in: ids } }],
        });
      }
      // El personal son decenas de cuentas: se ordena en memoria por apellido, que vive en personas (§6).
      const usuarios = await listarUsuarios(bd, { AND: where });
      const datos = await personas.obtenerPersonas(
        bd,
        usuarios.map((u) => u.personaId),
      );
      const filas = usuarios
        .map((u) => ({ u, p: datos.get(u.personaId)! }))
        .sort((a, b) => compararPorApellido(a.p, b.p) || a.u.id - b.u.id);
      const { skip, take } = desplazamiento(filtros);
      return {
        datos: filas.slice(skip, skip + take).map(({ u, p }) => detalle(u, p, ahora)),
        pagina: filtros.pagina,
        porPagina: filtros.porPagina,
        total: filas.length,
      };
    },

    async obtener(id: number): Promise<UsuarioDetalle> {
      const { u, p } = await cargar(bd, id);
      return detalle(u, p);
    },

    async crear({ rol, sedeId, ...datosPersona }: DatosCrearUsuario): Promise<UsuarioConPassword> {
      const passwordTemporal = generarPasswordTemporal();
      const passwordHash = await hashPassword(passwordTemporal); // fuera de la transacción: tarda
      const usuario = await bd.$transaction(async (tx) => {
        const existente = await personas.buscarPersonaPorCi(tx, datosPersona.ci, datosPersona.complemento);
        const cuentas = existente ? await cuentasDePersona(tx, existente.id) : [];
        const username = usernameNuevo(usernameDe(datosPersona.ci, datosPersona.complemento), rol, cuentas);
        if (!username) {
          throw new ErrorConflicto(
            'Ya existe un usuario con ese CI. Solo se le puede sumar una cuenta de Administrador.',
            undefined,
            'USUARIO_EXISTENTE',
          );
        }
        // Si la persona ya existe (sin cuenta, p. ej. con file, o con su cuenta de Kardex), se reutiliza sin tocar
        // sus datos (DEC-020 #6).
        const persona = existente ?? (await personas.crearPersona(tx, datosPersona));
        const { id } = await conSedeValida(async () =>
          crearUsuario(tx, {
            personaId: persona.id,
            rolId: await buscarRolId(tx, rol),
            sedeId,
            username,
            passwordHash,
          }),
        );
        const { u, p } = await cargar(tx, id);
        const creado = detalle(u, p);
        await registrarEvento(tx, {
          accion: 'CREAR',
          modulo: 'SEGURIDAD',
          entidad: 'usuario',
          entidadId: id,
          despues: creado,
        });
        return creado;
      });
      return { usuario, passwordTemporal };
    },

    async editar(autorId: number, id: number, cambios: CambiosUsuarioApi): Promise<UsuarioDetalle> {
      return bd.$transaction(async (tx) => {
        await bloquearCambiosDeAdmin(tx);
        const { u, p } = await cargar(tx, id);
        const antes: Record<string, unknown> = {};
        const despues: Record<string, unknown> = {};
        const cambiosPersona: CambiosPersonales = {};
        for (const campo of CAMPOS_PERSONALES) {
          const valor = cambios[campo];
          if (valor !== undefined && valor !== p[campo]) {
            Object.assign(cambiosPersona, { [campo]: valor });
            antes[campo] = p[campo];
            despues[campo] = valor;
          }
        }
        const apellidoPaterno =
          cambiosPersona.apellidoPaterno !== undefined ? cambiosPersona.apellidoPaterno : p.apellidoPaterno;
        const apellidoMaterno =
          cambiosPersona.apellidoMaterno !== undefined ? cambiosPersona.apellidoMaterno : p.apellidoMaterno;
        if (!apellidoPaterno && !apellidoMaterno) {
          throw new ErrorValidacion([{ ruta: 'body.apellidoPaterno', mensaje: 'Debe tener al menos un apellido' }]);
        }

        const cambiosCuenta: CambiosUsuario = {};
        if (cambios.rol !== undefined && cambios.rol !== u.rol.codigo) {
          if (id === autorId) throw sobreSiMismo('No puede cambiar su propio rol.');
          // Con dos cuentas, cada una es de su rol: el nombre de usuario lo dice (DEC-063).
          if ((await cuentasDePersona(tx, u.personaId)).length > 1) {
            throw new ErrorNegocio(
              'Esta persona tiene dos cuentas (una de Administrador): el rol de cada una no se cambia.',
              'CUENTA_DOBLE',
            );
          }
          if (u.rol.codigo === 'ADMIN') await exigirOtroAdmin(tx, u);
          cambiosCuenta.rolId = await buscarRolId(tx, cambios.rol);
          antes.rol = u.rol.codigo;
          despues.rol = cambios.rol;
        }
        if (cambios.sedeId !== undefined && cambios.sedeId !== u.sedeId) {
          cambiosCuenta.sedeId = cambios.sedeId;
          antes.sedeId = u.sedeId;
          despues.sedeId = cambios.sedeId;
        }

        // Nada cambió de verdad: no hay escritura ni evento.
        if (Object.keys(despues).length === 0) return detalle(u, p);
        if (Object.keys(cambiosPersona).length > 0) await personas.actualizarPersona(tx, p.id, cambiosPersona);
        if (Object.keys(cambiosCuenta).length > 0) {
          await conSedeValida(() => actualizarUsuario(tx, id, cambiosCuenta));
        }
        await registrarEvento(tx, {
          accion: 'EDITAR',
          modulo: 'SEGURIDAD',
          entidad: 'usuario',
          entidadId: id,
          antes,
          despues,
        });
        const final = await cargar(tx, id);
        return detalle(final.u, final.p);
      });
    },

    async darDeBaja(autorId: number, id: number): Promise<UsuarioDetalle> {
      if (id === autorId) throw sobreSiMismo('No puede darse de baja a sí mismo.');
      return bd.$transaction(async (tx) => {
        await bloquearCambiosDeAdmin(tx);
        const { u } = await cargar(tx, id);
        if (!u.activo) throw sinCambio('El usuario ya está dado de baja.');
        await exigirOtroAdmin(tx, u);
        await actualizarUsuario(tx, id, { activo: false });
        // Pierde el acceso ya: el access token que tenga vence en 15 min y no puede renovarse (DEC-014).
        await revocarRefreshTokensDeUsuario(tx, id, new Date());
        await registrarEvento(tx, {
          accion: 'DAR_DE_BAJA',
          modulo: 'SEGURIDAD',
          entidad: 'usuario',
          entidadId: id,
          antes: { activo: true },
          despues: { activo: false },
        });
        const final = await cargar(tx, id);
        return detalle(final.u, final.p);
      });
    },

    async reactivar(id: number): Promise<UsuarioDetalle> {
      return bd.$transaction(async (tx) => {
        const { u } = await cargar(tx, id);
        if (u.activo) throw sinCambio('El usuario ya está activo.');
        await actualizarUsuario(tx, id, { activo: true });
        await registrarEvento(tx, {
          accion: 'REACTIVAR',
          modulo: 'SEGURIDAD',
          entidad: 'usuario',
          entidadId: id,
          antes: { activo: false },
          despues: { activo: true },
        });
        const final = await cargar(tx, id);
        return detalle(final.u, final.p);
      });
    },

    async restablecerPassword(id: number): Promise<UsuarioConPassword> {
      await cargar(bd, id); // 404 antes de gastar un hash
      const passwordTemporal = generarPasswordTemporal();
      const passwordHash = await hashPassword(passwordTemporal);
      const usuario = await bd.$transaction(async (tx) => {
        // Obliga a cambiarla, limpia el bloqueo y cierra las sesiones: si alguien la había robado, pierde el acceso.
        await actualizarUsuario(tx, id, {
          passwordHash,
          debeCambiarPassword: true,
          bloqueadoHasta: null,
          intentosFallidos: 0,
        });
        await revocarRefreshTokensDeUsuario(tx, id, new Date());
        await registrarRestablecimientoPassword(tx, id);
        const { u, p } = await cargar(tx, id);
        return detalle(u, p);
      });
      return { usuario, passwordTemporal };
    },

    async desbloquear(id: number): Promise<UsuarioDetalle> {
      return bd.$transaction(async (tx) => {
        const { u } = await cargar(tx, id);
        if (!u.bloqueadoHasta || u.bloqueadoHasta <= new Date()) throw sinCambio('El usuario no está bloqueado.');
        await actualizarUsuario(tx, id, { bloqueadoHasta: null, intentosFallidos: 0 });
        await registrarDesbloqueo(tx, id, { bloqueadoHasta: u.bloqueadoHasta, intentosFallidos: u.intentosFallidos });
        const final = await cargar(tx, id);
        return detalle(final.u, final.p);
      });
    },
  };
}

export type ServicioUsuarios = ReturnType<typeof crearServicioUsuarios>;
