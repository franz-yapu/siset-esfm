import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/servidor.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node26',
  outDir: 'dist',
  clean: true,
});
