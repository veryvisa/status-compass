import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://veryvisa.github.io',
  base: process.env.BASE_PATH || '/status-compass',
  trailingSlash: 'always',
  output: 'static',
  vite: { cacheDir: '.astro/vite' }
});
