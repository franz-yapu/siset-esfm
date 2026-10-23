import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

// La versión que se ve al pie sale de package.json (src/config/version.ts).
process.env.VITE_VERSION = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
).version;

// El despliegue de prueba publica contraseñas en el login: que no lo indexen los buscadores (SDD S0.12 §2.5).
const noIndexar: Plugin = {
  name: 'siset-noindex-prueba',
  transformIndexHtml: (html) =>
    process.env.VITE_CUENTAS_PRUEBA === 'true'
      ? html.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />')
      : html,
};

export default defineConfig({
  plugins: [react(), tailwindcss(), noIndexar],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // En desarrollo, /api va a la API local: mismo origen para la cookie del refresh (SDD S0.8 §2.1).
  server: { proxy: { '/api': { target: process.env.API_PROXY ?? 'http://localhost:3000' } } },
});
