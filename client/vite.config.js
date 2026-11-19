import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // changeOrigin must stay false: the API's CSRF check compares Origin to the Host the browser used.
  server: { proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
      manifest: {
        name: 'F&F Stock Checker',
        short_name: 'F&F Stock',
        description: 'F&F Global stock checker for admins and salesmen',
        theme_color: '#B25E44',
        background_color: '#FCFDF5',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
