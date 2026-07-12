import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import TanStackRouter from '@tanstack/router-plugin/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    TanStackRouter(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

