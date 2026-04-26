import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  esbuild: {
    loader: 'jsx',
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'app/src'),
      'ui': path.resolve(__dirname, 'app'),
      '@theme-toggles/react': path.resolve(__dirname, 'tests/mocks/theme-toggles-react.js'),
      '@theme-toggles/react/css/Classic.css': path.resolve(__dirname, 'tests/mocks/empty-style.js'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['**/*.smoke.test.*', '**/node_modules/**', '**/dist/**', '**/build/**', '**/build-target/**', '**/._*'],
  },
});
