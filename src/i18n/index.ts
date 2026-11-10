import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import uk from './locales/uk.json'
import { useUserStore } from '../store/useUserStore'

export const SUPPORTED_LANGUAGES = ['en', 'uk'] as const

// Мова за замовчуванням en. Вибір користувача живе в useUserStore
// і синхронізується в i18n при старті та при зміні.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    uk: { translation: uk },
  },
  lng: useUserStore.getState().interfaceLanguage,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
