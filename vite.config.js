import { defineConfig } from 'vite';

export default defineConfig({
  base: '/newsfinder/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
