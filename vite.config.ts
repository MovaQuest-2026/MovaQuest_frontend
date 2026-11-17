import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vite.dev/config/
// Tailwind використовується тільки лендінгом (src/landing/landing.css).
export default defineConfig(({ mode }) => {
  // Бекенд для локальної розробки: за замовчуванням той самий Render, що й на Vercel.
  // Локальний бекенд: VITE_API_PROXY_TARGET=http://localhost:8000 у .env.local.
  const target = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_PROXY_TARGET || 'https://backend-hb2j.onrender.com'
  // /api на тому ж origin, що й застосунок (як rewrite у vercel.json): cookie сесії first-party, без CORS.
  // changeOrigin підміняє Host на хост бекенду, тож справжній origin фронту передаємо в X-Forwarded-Host/Proto:
  // за ним бекенд (OAUTH_ALLOWED_BASE_URLS, TRUSTED_PROXY_HOPS ≥ 1) вибирає callback-адресу Google-входу.
  const proxy: Record<string, ProxyOptions> = {
    '/api': {
      target,
      changeOrigin: true,
      secure: true,
      configure: (p) => {
        p.on('proxyReq', (proxyReq, req) => {
          const host = req.headers.host
          if (host) {
            proxyReq.setHeader('X-Forwarded-Host', host)
            proxyReq.setHeader('X-Forwarded-Proto', 'encrypted' in req.socket ? 'https' : 'http')
          }
        })
      },
    },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
