import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/compliance/', // ← Critical for subpath proxy
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000 // Suppress chunk size warning
  }
})
