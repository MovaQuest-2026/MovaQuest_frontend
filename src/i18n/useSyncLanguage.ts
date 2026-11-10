import { useEffect } from 'react'
import i18n from './index'
import { useUserStore } from '../store/useUserStore'

// Мова інтерфейсу живе в useUserStore; i18n і <html lang> ідуть за нею.
export function useSyncLanguage() {
  const lang = useUserStore((s) => s.interfaceLanguage)
  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang)
    document.documentElement.lang = lang
  }, [lang])
}
