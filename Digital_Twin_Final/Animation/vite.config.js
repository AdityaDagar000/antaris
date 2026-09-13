import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  server: {
    port: 8000,
    strictPort: true,
    host: true
  },
  preview: {
    port: 8000,
    host: true
  }
});
