import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiUrl = process.env.VITE_API_URL || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
  },
})