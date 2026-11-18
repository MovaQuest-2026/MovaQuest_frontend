import { useEffect } from 'react'
import { updateProfile } from '../../api/profile'
import { useUserStore } from '../../store/useUserStore'

const DEBOUNCE_MS = 800

/**
 * Зміни мови, рівня й мети в профілі йдуть у профіль акаунта (src/api/profile.ts).
 * Лише для того, хто ввійшов і пройшов онбординг; гостьові налаштування лишаються на пристрої.
 */
export function useProfileSync() {
  useEffect(() => {
    let timer = 0
    const unsubscribe = useUserStore.subscribe((s, prev) => {
      if (!s.account || !s.onboardingDone) return
      // Щойно ввійшли (або профіль щойно застосували після входу): це не зміна користувача.
      if (s.account !== prev.account || !prev.onboardingDone) return
      if (s.interfaceLanguage === prev.interfaceLanguage && s.level === prev.level && s.goal === prev.goal) return
      window.clearTimeout(timer)
      const accountId = s.account.id
      timer = window.setTimeout(() => {
        const { interfaceLanguage, level, goal, account } = useUserStore.getState()
        // Збій мережі: зміна лишається локально, наступна зміна надішле всі три поля.
        if (account?.id === accountId) updateProfile(accountId, { interfaceLanguage, level, goal }).catch(() => {})
      }, DEBOUNCE_MS)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])
}
