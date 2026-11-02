import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The move-in / move-out inspection at inspection.wlgre.com: its own page and bundle, sharing src/ with the application
export default defineConfig({
  root: 'inspection',
  plugins: [react()],
  resolve: { alias: { '/src': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: '../dist-inspection', emptyOutDir: true },
  server: { port: 5174 },
})
