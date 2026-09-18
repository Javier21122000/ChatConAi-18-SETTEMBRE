import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // SockJS expects this browser alias; no Node polyfills are required.
  define: { global: 'globalThis' },
  server: { port: 5173, strictPort: true },
});
