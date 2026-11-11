import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function pwaPrecachePlugin(): Plugin {
  return {
    name: 'pwa-precache-plugin',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      const swDistPath = path.resolve(distDir, 'sw.js')

      if (!fs.existsSync(swDistPath)) return

      const assetsDir = path.resolve(distDir, 'assets')
      const pwaIconsDir = path.resolve(distDir, 'pwa-icons')

      const precacheAssets = [
        '/',
        '/index.html',
        '/favicon.svg',
        '/icons.svg',
        '/manifest.json'
      ]

      if (fs.existsSync(assetsDir)) {
        const assetFiles = fs.readdirSync(assetsDir)
        for (const file of assetFiles) {
          precacheAssets.push(`/assets/${file}`)
        }
      }

      if (fs.existsSync(pwaIconsDir)) {
        const iconFiles = fs.readdirSync(pwaIconsDir)
        for (const icon of iconFiles) {
          precacheAssets.push(`/pwa-icons/${icon}`)
        }
      }

      const buildTime = Date.now()
      let swContent = fs.readFileSync(swDistPath, 'utf-8')

      // Reemplazar CACHE_NAME por versión única basada en fecha
      swContent = swContent.replace(
        /const CACHE_NAME = ['"][^'"]+['"];/,
        `const CACHE_NAME = 'matematica-v${buildTime}';`
      )

      // Reemplazar STATIC_ASSETS con la lista completa de archivos generados
      const formattedAssets = JSON.stringify(precacheAssets, null, 4)
      swContent = swContent.replace(
        /const STATIC_ASSETS = \[[^\]]*\];/s,
        `const STATIC_ASSETS = ${formattedAssets};`
      )

      fs.writeFileSync(swDistPath, swContent, 'utf-8')
      console.log(`\n[PWA] Inyectados ${precacheAssets.length} activos estáticos con hash en dist/sw.js (matematica-v${buildTime})`)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pwaPrecachePlugin()],
  base: '/',
  server: {
    host: true,
    allowedHosts: ['reactest.zonadocente.com', '.zonadocente.com'],
  },
  preview: {
    host: true,
    allowedHosts: ['reactest.zonadocente.com', '.zonadocente.com'],
  },
})
