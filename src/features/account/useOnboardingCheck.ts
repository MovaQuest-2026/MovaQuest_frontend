import { useEffect } from 'react'
import { getProfile } from '../../api/profile'
import { useUserStore } from '../../store/useUserStore'

/**
 * Під час запуску (і після входу) звіряє з профілем акаунта, чи пройдено онбординг.
 * Немає профілю — onboardingPending, і сторінки застосунку ведуть на /onboarding.
 * Профіль з'явився (наприклад, онбординг завершили на іншому пристрої) — прапорець знімається.
 */
export function useOnboardingCheck() {
  const accountId = useUserStore((s) => s.account?.id)
  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    getProfile(accountId)
      .then((profile) => {
        if (cancelled || useUserStore.getState().account?.id !== accountId) return
        useUserStore.getState().setOnboardingPending(profile === null)
      })
      // Немає зв'язку: лишаємо прапорець як є, перевіримо наступного разу.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [accountId])
}
