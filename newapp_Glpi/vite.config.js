// ====== À AJOUTER dans votre vite.config.js, dans server.proxy ======
//
// Vous avez déjà le proxy /glpi-api (API v2). Ajoutez /glpi-legacy (API v1)
// juste à côté. Exemple complet :

import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: {
    proxy: {
      // API v2 (High-Level) : création, lecture, OAuth2
      '/glpi-api': {
        target: 'http://glpi.local',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/glpi-api/, '/api.php')
      },
      // API v1 (Legacy) : UNIQUEMENT pour la purge (force_purge fiable)
      '/glpi-legacy': {
        target: 'http://glpi.local',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/glpi-legacy/, '/apirest.php')
      }
    }
  }
})
