import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://test.local'),
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    globals: true,
  },
});