import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Only apply jsx loader override via optimizeDeps for plain .js files.
  // .tsx files are handled natively by @vitejs/plugin-react (TypeScript + JSX).
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
      jsx: 'automatic',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 'ui' alias points to the app/ folder itself so imports like 'ui/icons.jsx'
      // resolve to app/src/assets/icons.jsx after the move.
      ui: path.resolve(__dirname, '.'),
      classnames: path.resolve(__dirname, './node_modules/classnames/index.js'),
      'fast-average-color': path.resolve(__dirname, './node_modules/fast-average-color/dist/index.esm.js'),
      'hotkeys-js': path.resolve(__dirname, './node_modules/hotkeys-js/dist/hotkeys.esm.js'),
      'perfect-freehand': path.resolve(__dirname, './node_modules/perfect-freehand/dist/esm/index.mjs'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    cors: true,
    fs: {
      allow: [path.resolve(__dirname, '.')],
    },
    proxy: {
      // Proxy S3 image fetches to avoid CORS when converting to data URL
      '/api/s3-img': {
        target: 'https://s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/s3-img/, ''),
        secure: true,
      },
    },
  },
})