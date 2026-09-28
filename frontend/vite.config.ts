import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import path from 'path'

const frontendPort = Number(process.env.VITE_FRONTEND_PORT ?? 15173)
const backendUrl = process.env.VITE_BACKEND_URL ?? 'http://localhost:18080'

export default defineConfig({
  // tanstackRouter 는 react() 보다 앞에 둬야 한다 (src/routes → routeTree.gen.ts 생성 + 라우트별 코드 스플리팅).
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#composition': path.resolve(__dirname, './src/composition'),
      '#domain': path.resolve(__dirname, './src/domain'),
      '#entity': path.resolve(__dirname, './src/entity'),
      '#page': path.resolve(__dirname, './src/routes'),
      '#shared': path.resolve(__dirname, './src/shared'),
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
