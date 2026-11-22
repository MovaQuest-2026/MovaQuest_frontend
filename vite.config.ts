import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'

const LESSONS_DIR = fileURLToPath(new URL('./src/mocks/lessons/', import.meta.url))

/**
 * Публікує уроки окремими файлами: /lessons/index.json (каталог) і /lessons/<id>.json.
 * Їх читає мобільний застосунок (EXPO_PUBLIC_CONTENT_BASE), тож новий урок з'являється там без оновлення в Play.
 * Вебверсія й далі вшиває уроки в бандл (import.meta.glob), ці файли їй не потрібні.
 */
function publishLessons(): Plugin {
  const files = () => readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json'))
  return {
    name: 'publish-lessons',
    generateBundle() {
      for (const f of files()) {
        this.emitFile({ type: 'asset', fileName: `lessons/${f}`, source: readFileSync(LESSONS_DIR + f, 'utf8') })
      }
    },
    // npm run dev: ті самі адреси, щоб застосунок можна було спрямувати на локальний вебсервер.
    configureServer(server) {
      server.middlewares.use('/lessons/', (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, ''))
        if (!files().includes(name)) return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(readFileSync(LESSONS_DIR + name, 'utf8'))
      })
    },
  }
}

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
    // «Будильник» Render: бекенд віддає /health поза /api/v1 (як rewrite у vercel.json). Має йти перед '/api'.
    '/api/health': { target, changeOrigin: true, secure: true, rewrite: () => '/health' },
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
    plugins: [react(), tailwindcss(), publishLessons()],
    server: { proxy },
    preview: { proxy },
  }
})
