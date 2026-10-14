import { describe, expect, it } from 'vitest';
import type { DatosCrearUsuario } from '@/types/usuarios';
import { ErrorApi, ErrorNegocio } from './errores';
import {
  erroresDelFormulario,
  nombreCompletoDe,
  normalizarDatosUsuario,
  usuarioDe,
  validarDatosUsuario,
} from './usuarios';

const validos: DatosCrearUsuario = {
  ci: '4567890',
  complemento: '1B',
  nombres: 'Rosa',
  apellidoPaterno: 'Quispe',
  apellidoMaterno: null,
  email: null,
  celular: '71234567',
  rol: 'SEC_COORD',
  sedeId: 2,
};

describe('validarDatosUsuario (SDD S1.13 §2.6, mismas reglas que la API)', () => {
  it('datos válidos → sin errores', () => {
    expect(validarDatosUsuario(validos)).toEqual({});
  });

  it.each([
    [{ ci: '45a7890' }, 'ci', 'El CI debe tener de 4 a 15 dígitos'],
    [{ ci: '123' }, 'ci', 'El CI debe tener de 4 a 15 dígitos'],
    [{ complemento: 'ABCDEF' }, 'complemento', 'El complemento tiene hasta 5 letras o dígitos'],
    [{ nombres: '' }, 'nombres', 'Los nombres son obligatorios'],
    [{ apellidoPaterno: null, apellidoMaterno: null }, 'apellidoPaterno', 'Debe tener al menos un apellido'],
    [{ email: 'no-es-correo' }, 'email', 'El correo no tiene un formato válido'],
    [{ celular: '1'.repeat(21) }, 'celular', 'Máximo 20 caracteres'],
    [{ sedeId: 0 }, 'sedeId', 'Elija una sede'],
  ] as const)('%o → error en %s', (cambio, campo, mensaje) => {
    expect(validarDatosUsuario({ ...validos, ...cambio })).toEqual({ [campo]: mensaje });
  });

  it('un solo apellido (cualquiera) alcanza', () => {
    expect(validarDatosUsuario({ ...validos, apellidoPaterno: null, apellidoMaterno: 'Mamani' })).toEqual({});
  });

  it('normaliza: recorta, complemento en mayúsculas y vacío → null', () => {
    expect(
      normalizarDatosUsuario({ ...validos, ci: ' 4567890 ', complemento: ' 1b ', email: '  ', apellidoMaterno: '' }),
    ).toEqual({ ...validos, email: null, apellidoMaterno: null });
  });
});

describe('erroresDelFormulario', () => {
  it('VALIDACION: cada `detalles[].ruta` va a su campo', () => {
    const e = new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [
      { ruta: 'body.ci', mensaje: 'El CI debe tener de 4 a 15 dígitos' },
      { ruta: 'body.apellidoPaterno', mensaje: 'Debe tener al menos un apellido' },
    ]);
    expect(erroresDelFormulario(e)).toEqual({
      campos: { ci: 'El CI debe tener de 4 a 15 dígitos', apellidoPaterno: 'Debe tener al menos un apellido' },
      general: null,
    });
  });

  it('VALIDACION con una ruta que no es un campo → aviso general', () => {
    const e = new ErrorApi('Los datos enviados no son válidos.', 'VALIDACION', 400, [
      { ruta: 'body', mensaje: 'Envíe al menos un campo para editar' },
    ]);
    expect(erroresDelFormulario(e)).toEqual({ campos: {}, general: 'Envíe al menos un campo para editar' });
  });

  it('USUARIO_EXISTENTE va al CI y SEDE_INEXISTENTE a la sede', () => {
    expect(erroresDelFormulario(new ErrorApi('Ya existe', 'USUARIO_EXISTENTE', 409)).campos).toEqual({
      ci: 'Ya existe',
    });
    expect(erroresDelFormulario(new ErrorApi('No existe', 'SEDE_INEXISTENTE', 422)).campos).toEqual({
      sedeId: 'No existe',
    });
  });

  it('cualquier otro error → aviso general con su mensaje', () => {
    expect(erroresDelFormulario(new ErrorApi('Sin Kardex', 'ULTIMO_KARDEX', 422))).toEqual({
      campos: {},
      general: 'Sin Kardex',
    });
    expect(erroresDelFormulario(new ErrorNegocio('Algo'))).toEqual({ campos: {}, general: 'Algo' });
  });
});

describe('usuarioDe y nombreCompletoDe', () => {
  it('usuario = CI o CI-COMPLEMENTO (D-25)', () => {
    expect(usuarioDe('4567890', '')).toBe('4567890');
    expect(usuarioDe('4567890', '1B')).toBe('4567890-1B');
  });

  it('nombre = nombres y apellidos presentes', () => {
    expect(nombreCompletoDe({ nombres: 'Rosa', apellidoPaterno: null, apellidoMaterno: 'Mamani' })).toBe('Rosa Mamani');
  });
});
