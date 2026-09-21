import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* to the R Plumber backend during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    // Fallback env vars (override via .env.local)
    'import.meta.env.VITE_API_URL':   JSON.stringify('http://localhost:8000'),
    'import.meta.env.VITE_USE_MOCK':  JSON.stringify('true'),
  },
})
