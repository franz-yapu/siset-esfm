import { describe, expect, it } from 'vitest';
import type { RegistroAuditoria } from '@/types/bitacora';
import {
  describirEntidad,
  describirRegistro,
  diferencias,
  etiquetaAccion,
  etiquetaModulo,
  fechaHoraLaPaz,
  filtrosAUrl,
  filtrosDesdeUrl,
  textoValor,
  tonoAccion,
} from './presentacion';

const registro = (p: Partial<RegistroAuditoria>): RegistroAuditoria => ({
  id: 1,
  fecha: '2026-10-20T14:03:11.000Z',
  usuario: { id: 3, usuario: '1234567', nombre: 'Ana Mamani' },
  accion: 'LOGIN',
  modulo: 'SEGURIDAD',
  entidad: 'usuario',
  entidadId: '3',
  antes: null,
  despues: null,
  ip: '10.0.0.1',
  userAgent: null,
  ...p,
});

describe('etiquetas (SDD S6.5 §2.2)', () => {
  it('acción y módulo en español; un código desconocido se muestra tal cual', () => {
    expect(etiquetaAccion(registro({ accion: 'DESBLOQUEAR_CUENTA' }))).toBe('Desbloqueo de cuenta');
    expect(etiquetaAccion(registro({ accion: 'ACCION_NUEVA' }))).toBe('ACCION_NUEVA');
    expect(etiquetaModulo('HOJAS_RUTA')).toBe('Hojas de ruta');
    expect(etiquetaModulo('OTRO')).toBe('OTRO');
    expect(tonoAccion('REUSO_SESION')).toBe('peligro');
    expect(tonoAccion('OTRO')).toBe('normal');
  });

  it('LOGIN_FALLIDO agrega el motivo', () => {
    const r = registro({ accion: 'LOGIN_FALLIDO', despues: { motivo: 'PASSWORD_INCORRECTA', intentosFallidos: 2 } });
    expect(etiquetaAccion(r)).toBe('Intento de ingreso fallido · contraseña incorrecta');
  });
});

describe('describirRegistro (§2.6)', () => {
  it('intento con un CI inexistente (DEC-018 #2)', () => {
    const r = registro({
      usuario: null,
      accion: 'LOGIN_FALLIDO',
      entidadId: '9999999',
      despues: { motivo: 'CI_INEXISTENTE' },
    });
    expect(describirRegistro(r)).toBe('CI intentado: 9999999');
  });

  it('el propio usuario muestra su CI; otro usuario, su id', () => {
    expect(describirRegistro(registro({}))).toBe('Usuario 1234567');
    expect(describirRegistro(registro({ accion: 'EDITAR', entidadId: '8' }))).toBe('Usuario #8');
  });

  it('otras entidades, entidad desconocida y sin entidad', () => {
    expect(describirRegistro(registro({ entidad: 'file', entidadId: 'EST-1' }))).toBe('File EST-1');
    expect(describirRegistro(registro({ entidad: 'hoja_ruta', entidadId: 'HR-12' }))).toBe('Hoja de ruta HR-12');
    expect(describirRegistro(registro({ entidad: 'tramite_x', entidadId: '5' }))).toBe('tramite_x 5');
    expect(describirRegistro(registro({ entidad: null, entidadId: null }))).toBe('—');
    expect(describirEntidad('usuario', '4')).toBe('Usuario #4');
  });
});

describe('diferencias (§2.6, P-48)', () => {
  it('marca lo que cambió, lo que solo está de un lado y deja igual lo que no cambió', () => {
    const d = diferencias(
      { rol: 'SEC_DIR', sedeId: 1, solo: 'x' },
      { rol: 'SEC_COORD', sedeId: 1, nuevo: true, password: '[REDACTADO]' },
    );
    expect(d).toEqual([
      { campo: 'nuevo', antes: undefined, despues: true, enAntes: false, enDespues: true, cambio: true },
      {
        campo: 'password',
        antes: undefined,
        despues: '[REDACTADO]',
        enAntes: false,
        enDespues: true,
        cambio: true,
      },
      { campo: 'rol', antes: 'SEC_DIR', despues: 'SEC_COORD', enAntes: true, enDespues: true, cambio: true },
      { campo: 'sedeId', antes: 1, despues: 1, enAntes: true, enDespues: true, cambio: false },
      { campo: 'solo', antes: 'x', despues: undefined, enAntes: true, enDespues: false, cambio: true },
    ]);
  });

  it('objetos iguales con las claves en otro orden no cuentan como cambio', () => {
    expect(diferencias({ x: { a: 1, b: 2 } }, { x: { b: 2, a: 1 } })?.[0].cambio).toBe(false);
  });

  it('null de un lado se trata como objeto vacío; un valor que no es objeto devuelve null', () => {
    expect(diferencias(null, { a: 1 })).toHaveLength(1);
    expect(diferencias([1, 2], { a: 1 })).toBeNull();
    expect(diferencias({ a: 1 }, 'texto')).toBeNull();
  });

  it('textoValor', () => {
    expect(textoValor(null)).toBe('vacío');
    expect(textoValor(true)).toBe('Sí');
    expect(textoValor(false)).toBe('No');
    expect(textoValor('x', false)).toBe('—');
    expect(textoValor({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe('fechaHoraLaPaz (§2.7)', () => {
  it('muestra la hora de La Paz con segundos sin importar la zona del proceso', () => {
    expect(fechaHoraLaPaz('2026-10-20T03:30:05.000Z')).toBe('19/10/2026 23:30:05');
    expect(fechaHoraLaPaz('2026-10-20T14:03:11.000Z')).toBe('20/10/2026 10:03:11');
  });
});

describe('filtros en la URL (§2.3)', () => {
  it('lee los válidos e ignora los inválidos', () => {
    const p = new URLSearchParams(
      'usuarioId=abc&modulo=NOEXISTE&accion=LOGIN&desde=2026-13-45&hasta=2026-10-20&entidadId=5&pagina=0',
    );
    expect(filtrosDesdeUrl(p)).toEqual({ filtros: { accion: 'LOGIN', hasta: '2026-10-20' }, pagina: 1 });
  });

  it('ida y vuelta, sin los vacíos ni la página 1', () => {
    const f = { usuarioId: 3, modulo: 'FILES', entidad: 'file', entidadId: 'EST-1' } as const;
    expect(filtrosAUrl(f, 1).toString()).toBe('usuarioId=3&modulo=FILES&entidad=file&entidadId=EST-1');
    expect(filtrosDesdeUrl(filtrosAUrl(f, 3))).toEqual({ filtros: f, pagina: 3 });
    expect(filtrosAUrl({ desde: '' }).toString()).toBe('');
  });
});
