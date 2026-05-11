import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SPA is served at /workstation-spa/ during scaffolding.
// The migration slice will flip this to /workstation/ once the UI lands.
export default defineConfig({
  plugins: [react()],
  base: '/workstation-spa/',
  build: {
    outDir: '../workstation-spa',
    emptyOutDir: true,
  },
})
