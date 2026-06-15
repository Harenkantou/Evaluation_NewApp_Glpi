// vite.config.js
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
      '/glpi-api': {
        target: 'http://glpi.local',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/glpi-api/, '/api.php')
      },
      '/glpi-legacy': {
        target: 'http://glpi.local',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/glpi-legacy/, '/apirest.php')
      },
      // 👇 AJOUT CRITIQUE : Proxy pour votre API Spring Boot
      '/api': {
        target: 'http://localhost:8080', // Adaptez si votre Spring Boot tourne sur un autre port
        changeOrigin: true,
        secure: false
      }
    }
  }
})