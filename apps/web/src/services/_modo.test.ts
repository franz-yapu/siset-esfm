import { describe, expect, it } from 'vitest';
import { todoMock, usaApi } from './_modo';

describe('usaApi / todoMock (SDD S0.8 §2.3)', () => {
  it("'false' o vacío → todo mock", () => {
    for (const v of ['false', '', undefined]) {
      expect(usaApi('auth', v)).toBe(false);
      expect(todoMock(v)).toBe(true);
    }
  });

  it("'true' → todos usan la API", () => {
    expect(usaApi('auth', 'true')).toBe(true);
    expect(usaApi('files', 'TRUE')).toBe(true);
    expect(todoMock('true')).toBe(false);
  });

  it('una lista activa solo esos servicios (tolera espacios y mayúsculas)', () => {
    expect(usaApi('auth', ' Auth , files ')).toBe(true);
    expect(usaApi('files', ' Auth , files ')).toBe(true);
    expect(usaApi('pases', ' Auth , files ')).toBe(false);
    expect(usaApi('hojasRuta', 'hojasruta')).toBe(true);
    expect(todoMock('auth')).toBe(false);
  });

  it('un nombre desconocido no activa nada', () => {
    expect(usaApi('auth', 'inventado')).toBe(false);
  });
});
