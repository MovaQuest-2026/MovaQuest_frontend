import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useOnboardingCheck } from './features/account/useOnboardingCheck'
import { useProfileSync } from './features/account/useProfileSync'
import { useUserStore } from './store/useUserStore'
import { useSyncLanguage } from './i18n/useSyncLanguage'
import { useSyncTheme } from './lib/useSyncTheme'
import { LandingPage } from './landing/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { LatestLessonPage } from './pages/LatestLessonPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LessonsPage } from './pages/LessonsPage'
import { LessonPlayerPage } from './pages/LessonPlayerPage'
import { LessonResultPage } from './pages/LessonResultPage'
import { ProfilePage } from './pages/ProfilePage'

// Клікабельний прототип напрямків продукту: окремий лінивий чанк зі своїми стилями й стором.
const PrototypeApp = lazy(() => import('./prototype/PrototypeApp'))

// Хто зареєструвався, але не завершив онбординг, бачить його знову на будь-якій сторінці застосунку.
// Гостей це не стосується: вхід необов'язковий.
function FinishOnboarding({ children }: { children: ReactNode }) {
  const pending = useUserStore((s) => s.account !== null && s.onboardingPending)
  const { pathname, search } = useLocation()
  return pending ? <Navigate to="/onboarding" replace state={{ from: pathname + search }} /> : children
}

const app = (page: ReactNode) => <FinishOnboarding>{page}</FinishOnboarding>

function App() {
  useSyncLanguage()
  useSyncTheme()
  useProfileSync()
  useOnboardingCheck()
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      {/* Вхід необов'язковий: відео відкривається одразу. Увійти можна з профілю або з підказки над відео; онбординг іде після реєстрації. */}
      <Route path="/onboarding" element={<OnboardingPage />} />
      {/* /app, /lesson і «Головна» відкривають найновіше відео. */}
      <Route path="/app" element={app(<LatestLessonPage />)} />
      <Route path="/home" element={app(<LatestLessonPage />)} />
      <Route path="/lesson" element={app(<LatestLessonPage />)} />
      <Route path="/lessons" element={app(<LessonsPage />)} />
      <Route path="/lesson/:lessonId" element={app(<LessonPlayerPage />)} />
      <Route path="/lesson/:lessonId/result" element={app(<LessonResultPage />)} />
      <Route path="/profile" element={app(<ProfilePage />)} />
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
