import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Tailwind використовується тільки лендінгом (src/landing/landing.css).
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
