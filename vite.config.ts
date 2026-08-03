import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiUrl = process.env.VITE_API_URL;
if (!apiUrl) {
  throw new Error('VITE_API_URL no esta definida. Configurala antes del build: $env:VITE_API_URL="https://..."');
}
try { new URL(apiUrl); }
catch { throw new Error('VITE_API_URL invalida: ' + apiUrl); }

export default defineConfig({
  plugins: [react()],
  server: {
    open: false,
    host: 'localhost',
    port: 5173,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
