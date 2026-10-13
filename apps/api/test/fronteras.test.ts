import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Verifica las reglas de frontera de ADR-0001 contra la configuración real de
// ESLint del repo, con rutas virtuales: no depende de que existan módulos.
const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const eslint = new ESLint({ cwd: raiz });

async function erroresDeFrontera(codigo: string, archivo: string): Promise<string[]> {
  const [resultado] = await eslint.lintText(`${codigo}\n`, { filePath: `${raiz}apps/api/src/${archivo}` });
  return resultado.messages.filter((m) => m.ruleId === 'no-restricted-imports').map((m) => m.message);
}

describe('fronteras entre módulos (ADR-0001)', () => {
  it('rechaza importar un archivo interno de otro módulo', async () => {
    const errores = await erroresDeFrontera(
      "export { x } from '@/modulos/pases/pases.repositorio';",
      'modulos/hojas-ruta/hojas-ruta.servicio.ts',
    );
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('@/modulos/<modulo>');
  });

  it('rechaza salir de un módulo con una ruta relativa', async () => {
    const errores = await erroresDeFrontera(
      "export { x } from '../pases';",
      'modulos/hojas-ruta/hojas-ruta.servicio.ts',
    );
    expect(errores).toHaveLength(1);
  });

  it('rechaza que compartido/ dependa de un módulo', async () => {
    const errores = await erroresDeFrontera("export { x } from '@/modulos/seguridad';", 'compartido/http/autorizar.ts');
    expect(errores).toHaveLength(1);
    expect(errores[0]).toContain('compartido/');
  });

  it('rechaza el import interno también fuera de modulos/ (por ejemplo, en app.ts)', async () => {
    const errores = await erroresDeFrontera("export { x } from '@/modulos/pases/pases.rutas';", 'app.ts');
    expect(errores).toHaveLength(1);
  });

  it('acepta el index de otro módulo, archivos propios y compartido/', async () => {
    const errores = await erroresDeFrontera(
      [
        "export { a } from '@/modulos/pases';",
        "export { b } from './hojas-ruta.repositorio';",
        "export { c } from '@/compartido/errores';",
      ].join('\n'),
      'modulos/hojas-ruta/hojas-ruta.servicio.ts',
    );
    expect(errores).toEqual([]);
  });
});
