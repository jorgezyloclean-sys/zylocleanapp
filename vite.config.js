import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Marca de versión: sirve para saber, al mirar la app de otra persona, si está viendo
// la última versión o una página vieja guardada en caché del navegador.
const commit = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'local' }
})()
const build = `${new Date().toISOString().slice(0, 10)} · ${commit}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD__: JSON.stringify(build) },
})
