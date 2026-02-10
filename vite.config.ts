import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          tensorflow: ['@tensorflow/tfjs'],
          charts: ['lightweight-charts'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
