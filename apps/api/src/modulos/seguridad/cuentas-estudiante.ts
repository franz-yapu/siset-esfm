import type { ClienteBd, TransaccionBd } from '@/compartido/bd';
import { registrarEvento } from '@/modulos/auditoria';
import { hashPassword } from './password';
import { revocarRefreshTokensDeUsuario } from './refresh-token.repositorio';
import { actualizarUsuario, buscarRolId, crearUsuario } from './usuario.repositorio';
import { usernameDe } from './usuarios.servicio';

// Cuentas de estudiante (DEC-064 #4 y #5): las crea el file, no el Administrador. Usuario = CI (con complemento si
// lo tiene); contraseña inicial = fecha de nacimiento dd-mm-aaaa, temporal, con cambio obligatorio en el primer
// ingreso. Los egresados no tienen cuenta (D-08): al pasar a egresado, la cuenta se desactiva.

type Cliente = ClienteBd | TransaccionBd;

export type ResultadoCuenta = 'CREADA' | 'EXISTENTE' | 'REACTIVADA' | 'USUARIO_OCUPADO';

/** "2004-03-15" (como la guarda el file) → "15-03-2004" (como la escribe el estudiante). */
export const passwordInicialEstudiante = (fechaNacimiento: string): string => {
  const [a, m, d] = fechaNacimiento.split('-');
  return `${d}-${m}-${a}`;
};

/** El hash de la contraseña inicial. Tarda (bcrypt): en una importación se calcula antes de la transacción. */
export const hashInicialEstudiante = (fechaNacimiento: string) =>
  hashPassword(passwordInicialEstudiante(fechaNacimiento));

const cuentaDeEstudiante = async (cliente: Cliente, personaId: number) =>
  cliente.usuario.findFirst({
    where: { personaId, rol: { codigo: 'ESTUDIANTE' } },
    select: { id: true, activo: true },
  });

/**
 * Deja al estudiante con su cuenta activa. Si no la tiene, la crea con la contraseña inicial; si estaba
 * desactivada (volvió de egresado), la reactiva sin cambiarle la contraseña. Si su CI ya es el usuario de otra
 * cuenta (p. ej. del personal), no crea nada y lo informa.
 */
export async function asegurarCuentaEstudiante(
  tx: TransaccionBd,
  datos: { personaId: number; ci: string; complemento: string; passwordHash: string },
): Promise<ResultadoCuenta> {
  const actual = await cuentaDeEstudiante(tx, datos.personaId);
  if (actual?.activo) return 'EXISTENTE';
  if (actual) {
    await actualizarUsuario(tx, actual.id, { activo: true });
    await registrarEvento(tx, {
      accion: 'REACTIVAR',
      modulo: 'SEGURIDAD',
      entidad: 'usuario',
      entidadId: actual.id,
      antes: { activo: false },
      despues: { activo: true, motivo: 'VOLVIO_A_ESTUDIANTE' },
    });
    return 'REACTIVADA';
  }
  const username = usernameDe(datos.ci, datos.complemento);
  if (await tx.usuario.findUnique({ where: { username }, select: { id: true } })) return 'USUARIO_OCUPADO';
  const { id } = await crearUsuario(tx, {
    personaId: datos.personaId,
    rolId: await buscarRolId(tx, 'ESTUDIANTE'),
    sedeId: null,
    username,
    passwordHash: datos.passwordHash,
  });
  // Nunca la contraseña ni su hash: solo que es la inicial y que hay que cambiarla.
  await registrarEvento(tx, {
    accion: 'CREAR',
    modulo: 'SEGURIDAD',
    entidad: 'usuario',
    entidadId: id,
    despues: { usuario: username, rol: 'ESTUDIANTE', inicial: 'FECHA_NACIMIENTO', debeCambiarPassword: true },
  });
  return 'CREADA';
}

/** El estudiante pasó a egresado (D-08): su cuenta se desactiva y se cierran sus sesiones. */
export async function desactivarCuentaEstudiante(tx: TransaccionBd, personaId: number): Promise<boolean> {
  const actual = await cuentaDeEstudiante(tx, personaId);
  if (!actual?.activo) return false;
  await actualizarUsuario(tx, actual.id, { activo: false });
  await revocarRefreshTokensDeUsuario(tx, actual.id, new Date());
  await registrarEvento(tx, {
    accion: 'DAR_DE_BAJA',
    modulo: 'SEGURIDAD',
    entidad: 'usuario',
    entidadId: actual.id,
    antes: { activo: true },
    despues: { activo: false, motivo: 'EGRESADO' },
  });
  return true;
}
