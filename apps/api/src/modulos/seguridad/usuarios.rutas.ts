import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import { esquemaError, validar, type ZodOpenApiPathsObject } from '@/compartido/http';
import type { ZodOpenApiPathItemObject, ZodOpenApiResponseObject } from 'zod-openapi';
import type { Autorizar } from './autorizar';
import type { crearControladorUsuarios } from './usuarios.controlador';
import {
  esquemaCrearUsuario,
  esquemaEditarUsuario,
  esquemaFiltrosUsuarios,
  esquemaIdUsuario,
  esquemaPaginaUsuarios,
  esquemasCrearUsuario,
  esquemasEditarUsuario,
  esquemasListarUsuarios,
  esquemasUnUsuario,
  esquemaUsuarioConPassword,
  esquemaUsuarioDetalle,
} from './usuarios.esquemas';

/** `/usuarios`, solo ADMIN (SDD S1.8 §2.1, DEC-054). */
export const crearRutasUsuarios = (
  controlador: ReturnType<typeof crearControladorUsuarios>,
  autenticar: RequestHandler,
  autorizar: Autorizar,
): Router => {
  const leer = [autenticar, autorizar('usuarios', 'leer')];
  const crear = [autenticar, autorizar('usuarios', 'crear')];
  const editar = [autenticar, autorizar('usuarios', 'editar')];
  const uno = validar(esquemasUnUsuario);
  return Router()
    .get('/usuarios', ...leer, validar(esquemasListarUsuarios), controlador.listar)
    .get('/usuarios/:id', ...leer, uno, controlador.obtener)
    .post('/usuarios', ...crear, validar(esquemasCrearUsuario), controlador.crear)
    .patch('/usuarios/:id', ...editar, validar(esquemasEditarUsuario), controlador.editar)
    .post('/usuarios/:id/baja', ...editar, uno, controlador.darDeBaja)
    .post('/usuarios/:id/reactivar', ...editar, uno, controlador.reactivar)
    .post('/usuarios/:id/restablecer-password', ...editar, uno, controlador.restablecerPassword)
    .post('/usuarios/:id/desbloquear', ...editar, uno, controlador.desbloquear);
};

const error = (description: string) => ({ description, content: { 'application/json': { schema: esquemaError } } });
const json = (description: string, schema: z.ZodType): ZodOpenApiResponseObject => ({
  description,
  content: { 'application/json': { schema } },
});

const comunes = {
  '401': error('Falta el access token o no es válido (NO_AUTENTICADO).'),
  '403': error('Sin permiso (solo el Administrador) o con cambio de contraseña pendiente.'),
};
const deUno = { ...comunes, '404': error('El usuario no existe (NO_ENCONTRADO).') };

const accion = (
  summary: string,
  description: string,
  ok: ZodOpenApiResponseObject,
  errores: Record<string, ZodOpenApiResponseObject>,
): ZodOpenApiPathItemObject => ({
  post: {
    tags: ['Usuarios'],
    summary,
    description,
    security: [{ bearerAuth: [] }],
    requestParams: { path: esquemaIdUsuario },
    responses: { '200': ok, ...deUno, ...errores },
  },
});

export const openapiUsuarios: ZodOpenApiPathsObject = {
  '/api/v1/usuarios': {
    get: {
      tags: ['Usuarios'],
      summary: 'Listar usuarios',
      description: 'Filtros por texto (CI o nombre), rol, sede y estado; ordenado por apellido; paginado.',
      security: [{ bearerAuth: [] }],
      requestParams: { query: esquemaFiltrosUsuarios },
      responses: {
        '200': json('Una página de usuarios.', esquemaPaginaUsuarios),
        '400': error('Filtros inválidos (VALIDACION).'),
        ...comunes,
      },
    },
    post: {
      tags: ['Usuarios'],
      summary: 'Crear una cuenta del personal',
      description:
        'Crea la persona y su cuenta en una transacción. Si el CI ya es de una persona sin cuenta, la reutiliza sin cambiar sus datos. Devuelve la contraseña temporal una sola vez.',
      security: [{ bearerAuth: [] }],
      requestBody: { content: { 'application/json': { schema: esquemaCrearUsuario } } },
      responses: {
        '201': json('Cuenta creada.', esquemaUsuarioConPassword),
        '400': error('Datos inválidos (VALIDACION).'),
        ...comunes,
        '409': error('Ya existe un usuario con ese CI (USUARIO_EXISTENTE).'),
        '422': error('La sede no existe (SEDE_INEXISTENTE).'),
      },
    },
  },
  '/api/v1/usuarios/{id}': {
    get: {
      tags: ['Usuarios'],
      summary: 'Ver un usuario',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdUsuario },
      responses: {
        '200': json('El usuario.', esquemaUsuarioDetalle),
        '400': error('Id inválido (VALIDACION).'),
        ...deUno,
      },
    },
    patch: {
      tags: ['Usuarios'],
      summary: 'Editar datos personales, rol o sede',
      description: 'Solo los campos enviados. El CI no se edita.',
      security: [{ bearerAuth: [] }],
      requestParams: { path: esquemaIdUsuario },
      requestBody: { content: { 'application/json': { schema: esquemaEditarUsuario } } },
      responses: {
        '200': json('Usuario editado.', esquemaUsuarioDetalle),
        '400': error('Datos inválidos, sin campos o con el CI (VALIDACION).'),
        ...deUno,
        '422': error(
          'Cambiarse el propio rol (OPERACION_SOBRE_SI_MISMO), dejar sin Administrador (ULTIMO_ADMIN) o sede inexistente.',
        ),
      },
    },
  },
  '/api/v1/usuarios/{id}/baja': accion(
    'Dar de baja',
    'Baja lógica: no puede ingresar y se cierran sus sesiones.',
    json('Usuario dado de baja.', esquemaUsuarioDetalle),
    {
      '422': error(
        'Ya estaba de baja (ESTADO_SIN_CAMBIO), es uno mismo (OPERACION_SOBRE_SI_MISMO) o el último Administrador (ULTIMO_ADMIN).',
      ),
    },
  ),
  '/api/v1/usuarios/{id}/reactivar': accion(
    'Reactivar',
    'Vuelve a permitir el ingreso.',
    json('Usuario reactivado.', esquemaUsuarioDetalle),
    { '422': error('Ya estaba activo (ESTADO_SIN_CAMBIO).') },
  ),
  '/api/v1/usuarios/{id}/restablecer-password': accion(
    'Restablecer la contraseña',
    'Genera una temporal nueva (se muestra una sola vez), obliga a cambiarla, quita el bloqueo y cierra sus sesiones.',
    json('Contraseña restablecida.', esquemaUsuarioConPassword),
    {},
  ),
  '/api/v1/usuarios/{id}/desbloquear': accion(
    'Desbloquear',
    'Quita el bloqueo por intentos fallidos.',
    json('Usuario desbloqueado.', esquemaUsuarioDetalle),
    { '422': error('No estaba bloqueado (ESTADO_SIN_CAMBIO).') },
  ),
};
