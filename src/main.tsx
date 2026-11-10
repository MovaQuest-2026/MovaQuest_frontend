import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App.tsx'

// Збереження старої Phaser-гри більше не потрібні.
try {
  localStorage.removeItem('movaquest-save-v1')
  localStorage.removeItem('movaquest-save-v2')
} catch {
  // localStorage може бути недоступний (приватний режим) — це не критично.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
