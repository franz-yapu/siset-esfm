import { execFileSync } from 'node:child_process';
import { describe, expect, inject, it } from 'vitest';

describe('migraciones vs esquema (SDD S0.11 §4)', () => {
  it('prisma migrate diff no detecta diferencias: el SQL a mano no genera drift', () => {
    const salida = execFileSync(
      'npx',
      ['prisma', 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema', '--exit-code'],
      { env: { ...process.env, DATABASE_URL: inject('urlBdTest') }, encoding: 'utf8' },
    );
    // Con --exit-code, cualquier diferencia sale con código 2 y execFileSync lanza.
    expect(salida).toContain('No difference detected');
  });
});
