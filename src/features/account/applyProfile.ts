import { useUserStore } from '../../store/useUserStore'
import type { UserProfile } from '../../types/profile'

/** Профіль акаунта з «БД» → локальні налаштування. Онбординг тоді вважається пройденим. */
export function applyProfile(profile: UserProfile) {
  const user = useUserStore.getState()
  user.setInterfaceLanguage(profile.interfaceLanguage)
  user.setLevel(profile.level)
  user.setGoal(profile.goal)
  user.completeOnboarding()
  user.setOnboardingPending(false)
}
