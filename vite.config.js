import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    allowedHosts: ['lyfflow.com', 'www.lyfflow.com'],
    proxy: {
      '/v1': {
        target: 'https://api.lyfflow.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'api.lyfflow.com'
        }
      },
      '/api/auth': {
        target: 'https://api.lyfflow.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/v1/auth'),
        headers: {
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'api.lyfflow.com'
        }
      }
    }
  }
})
