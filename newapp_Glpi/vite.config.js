import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/glpi-api': {
        target: 'http://glpi.local',
        changeOrigin: true,
        // On proxyfie vers api.php SANS forcer la version :
        //  - /glpi-api/token        -> /api.php/token        (OAuth2)
        //  - /glpi-api/v2.3/Ticket  -> /api.php/v2.3/Ticket  (ressources v2)
        rewrite: (path) => path.replace(/^\/glpi-api/, '/api.php')
      }
    }
  }
})
