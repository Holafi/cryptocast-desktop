import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    assetsDir: './assets',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],

          // UI library chunks
          ui: ['@heroicons/react', 'react-hook-form'],

          // Utility chunks
          utils: ['ethers', '@solana/web3.js', 'date-fns'],

          // i18n chunk
          i18n: ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
    chunkSizeWarningLimit: 300, // Reduced from default 500 to aim for smaller chunks
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
    },
  },
})
