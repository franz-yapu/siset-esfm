import { describe, expect, it } from 'vitest';
import {
  ACCIONES_HOJA_RUTA,
  accionesPosibles,
  ESTADOS_HOJA_RUTA,
  evaluarTransicion,
  type AccionHojaRuta,
  type CodigoSede,
  type EstadoHojaRuta,
  type Flujo,
} from '@/modulos/hojas-ruta/maquina';

// Tabla de casos ESCRITA A MANO desde DEC-033 (no derivada de maquina.ts): estado, acción y flujo válidos, con
// quién y desde dónde, y si el file bloqueado lo impide (SDD S3.1-S3.3 §2.2, ADR-0005).
type Fila = [EstadoHojaRuta, AccionHojaRuta, Flujo[], string, CodigoSede, EstadoHojaRuta, boolean];
const V: Flujo[] = ['CON_VALORADO'];
const S: Flujo[] = ['SIN_VALORADO'];
const VS: Flujo[] = ['CON_VALORADO', 'SIN_VALORADO'];
const VALIDAS: Fila[] = [
  ['RECIBIDO', 'AVISAR_KARDEX', VS, 'SEC_DIR', 'LA_PAZ', 'AVISADO_KARDEX', true],
  ['AVISADO_KARDEX', 'RECOGER', VS, 'KARDEX', 'ANCOCAGUA', 'EN_IMPRESION', true],
  ['EN_IMPRESION', 'IMPRIMIR', VS, 'KARDEX', 'ANCOCAGUA', 'IMPRESO', true],
  ['IMPRESO', 'FIRMA_DIR_ACADEMICA', V, 'SEC_DIR', 'LA_PAZ', 'FIRMADO_DIR_ACADEMICA', false],
  ['FIRMADO_DIR_ACADEMICA', 'FIRMA_DIR_GENERAL', V, 'SEC_DIR', 'LA_PAZ', 'LISTO', false],
  ['IMPRESO', 'FIRMA_COORDINADOR', S, 'COORDINADOR', 'ANCOCAGUA', 'FIRMADO_COORDINADOR', false],
  ['FIRMADO_COORDINADOR', 'REMITIR', S, 'KARDEX', 'ANCOCAGUA', 'REMITIDO_CALAHUMANA', false],
  ['REMITIDO_CALAHUMANA', 'RECIBIR_CALAHUMANA', S, 'SEC_DIR', 'LA_PAZ', 'LISTO', false],
  ['LISTO', 'ENTREGAR', VS, 'SEC_DIR', 'LA_PAZ', 'ENTREGADO', false],
];

const ROLES = ['ESTUDIANTE', 'EGRESADO', 'SEC_DIR', 'SEC_COORD', 'COORDINADOR', 'KARDEX'];
const SEDES: (CodigoSede | null)[] = ['LA_PAZ', 'ANCOCAGUA', null];
const FLUJOS: Flujo[] = ['CON_VALORADO', 'SIN_VALORADO'];

describe('máquina de estados de la hoja de ruta (ADR-0005)', () => {
  it('toda combinación estado × acción × flujo × rol × sede × bloqueo da lo que dice la tabla', () => {
    let casos = 0;
    for (const estado of ESTADOS_HOJA_RUTA)
      for (const accion of ACCIONES_HOJA_RUTA)
        for (const flujo of FLUJOS)
          for (const rol of ROLES)
            for (const sede of SEDES)
              for (const fileBloqueado of [false, true]) {
                casos++;
                const fila = VALIDAS.find(([e, a, f]) => e === estado && a === accion && f.includes(flujo));
                const r = evaluarTransicion({ estado, flujo, fileBloqueado }, { rol, sede }, accion);
                if (!fila) {
                  expect(r, `${estado} ${accion} ${flujo}`).toMatchObject({ ok: false, error: 'TRANSICION_INVALIDA' });
                } else if (fila[3] !== rol || fila[4] !== sede) {
                  expect(r, `${estado} ${accion} ${rol} ${sede}`).toMatchObject({ ok: false, error: 'PROHIBIDO' });
                } else if (fila[6] && fileBloqueado) {
                  expect(r).toMatchObject({ ok: false, error: 'FILE_BLOQUEADO' });
                } else {
                  expect(r).toMatchObject({ ok: true, transicion: { hacia: fila[5] } });
                }
              }
    expect(casos).toBe(9 * 9 * 2 * 6 * 3 * 2);
  });

  it.each([
    ['CON_VALORADO', ['AVISAR_KARDEX', 'RECOGER', 'IMPRIMIR', 'FIRMA_DIR_ACADEMICA', 'FIRMA_DIR_GENERAL', 'ENTREGAR']],
    [
      'SIN_VALORADO',
      ['AVISAR_KARDEX', 'RECOGER', 'IMPRIMIR', 'FIRMA_COORDINADOR', 'REMITIR', 'RECIBIR_CALAHUMANA', 'ENTREGAR'],
    ],
  ] as const)('el flujo %s va de RECIBIDO a ENTREGADO con quien corresponde', (flujo, pasos) => {
    let estado: EstadoHojaRuta = 'RECIBIDO';
    for (const accion of pasos) {
      const fila = VALIDAS.find(([e, a]) => e === estado && a === accion)!;
      const r = evaluarTransicion({ estado, flujo, fileBloqueado: false }, { rol: fila[3], sede: fila[4] }, accion);
      if (!r.ok) throw new Error(`${flujo}: ${accion} falló (${r.error})`);
      estado = r.transicion.hacia;
    }
    expect(estado).toBe('ENTREGADO');
  });

  it('accionesPosibles: solo las del rol y la sede, y deshabilitadas si el file está bloqueado', () => {
    const h = { estado: 'IMPRESO' as const, flujo: 'SIN_VALORADO' as const, fileBloqueado: false };
    expect(accionesPosibles(h, { rol: 'COORDINADOR', sede: 'ANCOCAGUA' }).map((a) => a.accion)).toEqual([
      'FIRMA_COORDINADOR',
    ]);
    expect(accionesPosibles(h, { rol: 'SEC_DIR', sede: 'LA_PAZ' })).toEqual([]);
    expect(
      accionesPosibles(
        { estado: 'RECIBIDO', flujo: 'CON_VALORADO', fileBloqueado: true },
        { rol: 'SEC_DIR', sede: 'LA_PAZ' },
      ),
    ).toEqual([
      { accion: 'AVISAR_KARDEX', etiqueta: 'Avisar a Kardex', deshabilitada: 'El file del titular está bloqueado.' },
    ]);
  });
});
