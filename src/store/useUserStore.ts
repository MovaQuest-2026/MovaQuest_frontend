import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserState {
  onboardingDone: boolean
  completeOnboarding: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      onboardingDone: false,
      completeOnboarding: () => set({ onboardingDone: true }),
    }),
    { name: 'movaquest-user-v1' },
  ),
)
