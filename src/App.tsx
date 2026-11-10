import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useUserStore } from './store/useUserStore'
import { useSyncLanguage } from './i18n/useSyncLanguage'
import { LandingPage } from './landing/LandingPage'
import { HomePage } from './pages/HomePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LessonsPage } from './pages/LessonsPage'
import { LessonPlayerPage } from './pages/LessonPlayerPage'
import { LessonResultPage } from './pages/LessonResultPage'
import { ProfilePage } from './pages/ProfilePage'

// Клікабельний прототип напрямків продукту: окремий лінивий чанк зі своїми стилями й стором.
const PrototypeApp = lazy(() => import('./prototype/PrototypeApp'))

// Сторінки застосунку доступні після онбордингу; до того ведемо на /onboarding.
function RequireOnboarding({ children }: { children: ReactNode }) {
  const onboardingDone = useUserStore((s) => s.onboardingDone)
  return onboardingDone ? children : <Navigate to="/onboarding" replace />
}

function App() {
  useSyncLanguage()
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/home" element={<RequireOnboarding><HomePage /></RequireOnboarding>} />
      <Route path="/lessons" element={<RequireOnboarding><LessonsPage /></RequireOnboarding>} />
      <Route path="/lesson/:lessonId" element={<RequireOnboarding><LessonPlayerPage /></RequireOnboarding>} />
      <Route path="/lesson/:lessonId/result" element={<RequireOnboarding><LessonResultPage /></RequireOnboarding>} />
      <Route path="/profile" element={<RequireOnboarding><ProfilePage /></RequireOnboarding>} />
      <Route
        path="/prototype/*"
        element={
          <Suspense fallback={null}>
            <PrototypeApp />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
