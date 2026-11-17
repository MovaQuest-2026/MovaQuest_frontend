import type { NavigateFunction } from 'react-router-dom'
import { getProfile } from '../../api/profile'
import { useUserStore } from '../../store/useUserStore'
import type { Account } from '../../types/account'
import { applyProfile } from './applyProfile'

/**
 * Спільне для пароля й Google: зберегти акаунт, далі онбординг (профілю ще немає)
 * або застосувати профіль і повернутися на returnTo.
 */
export async function completeSignIn(account: Account, returnTo: string, navigate: NavigateFunction): Promise<void> {
  const user = useUserStore.getState()
  user.setAccount(account)
  // Онбординг одразу після реєстрації (і після першого входу через Google).
  // Якщо профіль уже є (вхід на новому пристрої), підтягуємо його й ідемо далі.
  const profile = await getProfile(account.id)
  if (!profile) {
    // Незавершений онбординг відкриється знову, навіть якщо зараз його закрити (див. App).
    user.setOnboardingPending(true)
    navigate('/onboarding', { replace: true, state: { from: returnTo } })
    return
  }
  applyProfile(profile)
  navigate(returnTo, { replace: true })
}

/** Куди повернутися після входу: адреса, з якої нас перенаправили, інакше найновіше відео. */
export function safeReturnPath(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/auth') ? from : '/app'
}
