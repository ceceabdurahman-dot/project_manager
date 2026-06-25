import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3005', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3005', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3005', ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
