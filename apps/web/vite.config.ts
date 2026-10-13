import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // En desarrollo, /api va a la API local: mismo origen para la cookie del refresh (SDD S0.8 §2.1).
  server: { proxy: { '/api': { target: process.env.API_PROXY ?? 'http://localhost:3000' } } },
});
