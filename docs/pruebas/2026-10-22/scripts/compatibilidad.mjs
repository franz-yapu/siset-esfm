// Compatibilidad: 3 motores × 3 tamaños. Login de Kardex, lista de files y seguimiento público.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/home/franz/Documentos/siset/apps/web/package.json');
const pw = require('@playwright/test');
const BASE = 'http://127.0.0.1:8080';
const tam = [['escritorio', { width: 1366, height: 768 }], ['tablet', { width: 820, height: 1180 }], ['celular', { width: 360, height: 800 }]];
const filas = [['navegador', 'dispositivo', 'login', 'lista de files', 'detalle de file', 'seguimiento público', 'sin scroll horizontal', 'errores de consola', 'carga inicial (ms)', 'resultado']];
for (const motor of ['chromium', 'chrome', 'firefox']) {
  let b;
  try { b = motor === 'chrome' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw[motor].launch(motor === 'chromium' ? { executablePath: process.env.C } : {}); } catch (e) { filas.push([motor, '-', 'no se pudo abrir: ' + String(e.message).split('\n')[0]]); continue; }
  for (const [nom, vp] of tam) {
    const ctx = await b.newContext({ viewport: vp, isMobile: nom === 'celular' && motor !== 'firefox', hasTouch: nom !== 'escritorio' });
    const p = await ctx.newPage(); const errores = [];
    p.on('console', (m) => m.type() === 'error' && !/401/.test(m.text()) && errores.push(m.text()));
    p.on('pageerror', (e) => errores.push(e.message));
    const r = { login: 'NO', lista: 'NO', detalle: 'NO', seg: 'NO', scroll: 'NO' };
    const t0 = Date.now();
    try {
      await p.goto(`${BASE}/login`, { waitUntil: 'networkidle' }); r.ms = Date.now() - t0;
      await p.getByLabel('CI o usuario').fill('9000001');
      await p.getByLabel('Contraseña', { exact: true }).fill('Prueba.2026');
      await p.getByRole('button', { name: /ingresar|iniciar/i }).click();
      await p.waitForURL(/kardex|inicio/, { timeout: 15000 }); r.login = 'SÍ';
      await p.goto(`${BASE}/files`, { waitUntil: 'networkidle' });
      await p.getByText(/8100\d{3}/).filter({ visible: true }).first().waitFor({ timeout: 15000 }); r.lista = 'SÍ';
      r.scroll = (await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) ? 'SÍ' : 'NO';
      await p.screenshot({ path: `compat/${motor}-${nom}-files.png` });
      await p.goto(`${BASE}/files/14`, { waitUntil: 'networkidle' });
      await p.getByText('8100011').filter({ visible: true }).first().waitFor({ timeout: 15000 }); r.detalle = 'SÍ';
      await p.screenshot({ path: `compat/${motor}-${nom}-detalle.png` });
      const s = await ctx.newPage();
      await s.goto(`${BASE}/seguimiento`, { waitUntil: 'networkidle' });
      r.seg = (await s.locator('input').count()) > 0 ? 'SÍ' : 'NO';
      await s.screenshot({ path: `compat/${motor}-${nom}-seguimiento.png` });
    } catch (e) { r.err = String(e.message).split('\n')[0]; }
    const ok = [r.login, r.lista, r.detalle, r.seg, r.scroll].every((x) => x === 'SÍ');
    filas.push([motor, `${nom} ${vp.width}×${vp.height}`, r.login, r.lista, r.detalle, r.seg, r.scroll, errores.length, r.ms ?? '', ok ? 'EXITOSA' : 'FALLIDA' + (r.err ? ': ' + r.err : '')]);
    await ctx.close(); await new Promise((z) => setTimeout(z, 7000));
  }
  await b.close();
}
fs.writeFileSync('compatibilidad.json', JSON.stringify(filas, null, 1));
console.table(filas);
