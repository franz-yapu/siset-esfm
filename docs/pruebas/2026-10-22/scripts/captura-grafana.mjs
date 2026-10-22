// Uso: node captura-grafana.mjs <desde_ms> <hasta_ms> <prefijo>
import { createRequire } from 'node:module';
const require = createRequire('/home/franz/Documentos/siset/apps/web/package.json');
const { chromium } = require('@playwright/test');
const [desde, hasta, pref] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/home/franz/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 1150 }, deviceScaleFactor: 1 });
for (const [uid, nom] of [['siset-k6', 'k6'], ['siset-recursos', 'recursos']]) {
  await p.goto(`http://localhost:3300/d/${uid}?orgId=1&from=${desde}&to=${hasta}&kiosk&theme=light&refresh=`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${pref}-grafana-${nom}.png`, fullPage: true });
}
await b.close();
