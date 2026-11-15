import { useEffect, useSyncExternalStore } from 'react'
import { useUserStore } from '../store/useUserStore'

export type Theme = 'light' | 'dark'

const QUERY = '(prefers-color-scheme: light)'
/** Колір рядка стану браузера, як --bg у index.css. */
const THEME_COLOR: Record<Theme, string> = { dark: '#0b0b0f', light: '#f6f6f8' }

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const systemTheme = (): Theme => (window.matchMedia(QUERY).matches ? 'light' : 'dark')

/** Тема, яку бачить користувач: обрана в профілі або системна. */
export function useResolvedTheme(): Theme {
  const preference = useUserStore((s) => s.theme)
  const system = useSyncExternalStore(subscribe, systemTheme, () => 'dark' as Theme)
  return preference === 'system' ? system : preference
}

// <html data-theme> і theme-color ідуть за темою. Без JS index.css бере системну тему сам.
export function useSyncTheme() {
  const theme = useResolvedTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])
}
