import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.BASE_PATH || './', build: { outDir: 'docs', target: 'es2022', assetsInlineLimit: 0 }, server: { port: 5194, strictPort: true } });
