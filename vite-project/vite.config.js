import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The backend runs separately (backend/, default http://localhost:5174).
  // During local dev and local preview, /api requests are proxied to it so
  // the frontend can keep using same-origin /api paths.
  server: {
    proxy: {
      '/api': 'http://localhost:5174',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:5174',
    },
  },
})
