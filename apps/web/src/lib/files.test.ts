import { describe, expect, it } from 'vitest';
import type { DatosCrearFile } from '@/types/files';
import { ErrorApi } from './errores';
import { cambiosDeFile, erroresDelFormularioFile, normalizarDatosFile, validarDatosFile } from './files';

const base: DatosCrearFile = {
  ci: '7654321',
  complemento: '',
  nombres: 'Juana',
  apellidoPaterno: 'Mamani',
  apellidoMaterno: null,
  fechaNacimiento: null,
  celular: null,
  email: null,
  codigo: 'EST-1',
  especialidadId: 2,
  anioIngreso: 2024,
  condicion: 'ESTUDIANTE',
  genero: null,
  modalidad: null,
  anioFormacion: null,
};

describe('reglas del formulario del file (SDD S2.9-S2.10 §2.5)', () => {
  it('normaliza como la API: recorta, complemento en mayúsculas y vacíos en null', () => {
    expect(
      normalizarDatosFile({
        ...base,
        ci: ' 7654321 ',
        complemento: '1a',
        apellidoMaterno: '  ',
        email: '',
        codigo: ' EST-1 ',
      }),
    ).toMatchObject({ ci: '7654321', complemento: '1A', apellidoMaterno: null, email: null, codigo: 'EST-1' });
  });

  it.each([
    ['CI con letras', { ci: '12AB' }, 'ci', 'El CI debe tener de 4 a 15 dígitos'],
    ['sin apellidos', { apellidoPaterno: null }, 'apellidoPaterno', 'Debe tener al menos un apellido'],
    ['sin código', { codigo: '' }, 'codigo', 'El código de estudiante es obligatorio'],
    ['sin especialidad', { especialidadId: 0 }, 'especialidadId', 'Elija la especialidad'],
    ['año viejo', { anioIngreso: 1989 }, 'anioIngreso', 'El año de ingreso va de 1990 en adelante'],
    [
      'año adelantado',
      { anioIngreso: 2030 },
      'anioIngreso',
      'El año de ingreso no puede ser posterior al año siguiente',
    ],
    ['correo inválido', { email: 'no' }, 'email', 'El correo no tiene un formato válido'],
  ])('%s', (_caso, cambio, campo, mensaje) => {
    expect(validarDatosFile({ ...base, ...cambio }, 2026)).toEqual({ [campo]: mensaje });
  });

  it('cambiosDeFile: solo lo que cambió, nunca el CI', () => {
    expect(cambiosDeFile(base, { ...base, ci: '1', celular: '7', anioIngreso: 2025 })).toEqual({
      celular: '7',
      anioIngreso: 2025,
    });
    expect(cambiosDeFile(base, { ...base })).toEqual({});
  });

  it('los errores de la API van a su campo', () => {
    const e = (codigo: string, detalles?: unknown) => new ErrorApi('mensaje', codigo, 409, detalles);
    expect(erroresDelFormularioFile(e('FILE_EXISTENTE')).campos).toEqual({ ci: 'mensaje' });
    expect(erroresDelFormularioFile(e('CODIGO_EXISTENTE')).campos).toEqual({ codigo: 'mensaje' });
    expect(erroresDelFormularioFile(e('ESPECIALIDAD_INEXISTENTE')).campos).toEqual({ especialidadId: 'mensaje' });
    expect(
      erroresDelFormularioFile(e('VALIDACION', [{ ruta: 'body.anioIngreso', mensaje: 'Año malo' }])).campos,
    ).toEqual({ anioIngreso: 'Año malo' });
    expect(erroresDelFormularioFile(e('OTRO'))).toEqual({ campos: {}, general: 'mensaje' });
  });
});
