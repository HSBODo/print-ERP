import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const frontendPort = Number(process.env.VITE_FRONTEND_PORT ?? 15173)
const backendUrl = process.env.VITE_BACKEND_URL ?? 'http://localhost:18080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('recharts')) {
            return 'charts'
          }

          if (id.includes('@tanstack/react-router') || id.includes('@tanstack/history')) {
            return 'router'
          }

          if (
            id.includes('@hookform/resolvers') ||
            id.includes('react-hook-form') ||
            id.includes('zod')
          ) {
            return 'forms'
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'framework'
          }

          return 'vendor'
        },
      },
    },
  },
  server: {
    port: frontendPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      // Swagger UI(백엔드 static /docs/**) 와 그 스펙 YAML, webjars 정적 자산.
      '/docs': { target: backendUrl, changeOrigin: true },
      '/webjars': { target: backendUrl, changeOrigin: true },
    },
  },
})
