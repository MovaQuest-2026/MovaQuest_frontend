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
  let profile
  try {
    profile = await getProfile(account.id)
  } catch {
    // Бекенд не відповів (Render прокидається): вхід уже відбувся, useOnboardingCheck перевірить профіль пізніше.
    navigate(returnTo, { replace: true })
    return
  }
  if (!profile) {
    // Незавершений онбординг відкриється знову, навіть якщо зараз його закрити (див. App).
    user.setOnboardingPending(true)
    navigate('/onboarding', { replace: true, state: { from: returnTo } })
    return
  }
  applyProfile(profile)
  navigate(returnTo, { replace: true })
}

/** Куди повернутися з /auth без входу («Не зараз»): адреса, з якої нас перенаправили, інакше найновіше відео. */
export function safeReturnPath(from: unknown): string {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/auth') ? from : '/app'
}

// Сторінки з відео: /app, /home, /lesson і /lesson/:id (без /result).
const VIDEO_PATH = /^\/(app|home|lesson)(\/[^/?#]+)?\/?([?#].*)?$/

/**
 * Куди йти після входу: одразу до відео. Якщо вхід почали з відео (лайк, коментар, підказка над відео),
 * повертаємось до того самого уроку; з інших сторінок (профіль, «Серії») — до найновішого відео.
 */
export function signInReturnPath(from: unknown): string {
  const path = safeReturnPath(from)
  return VIDEO_PATH.test(path) ? path : '/app'
}
