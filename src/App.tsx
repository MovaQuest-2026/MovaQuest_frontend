import { Navigate, Route, Routes } from 'react-router-dom'
import { useUserStore } from './store/useUserStore'
import { useSyncLanguage } from './i18n/useSyncLanguage'
import { OnboardingPage } from './pages/OnboardingPage'
import { LessonsPage } from './pages/LessonsPage'
import { LessonPlayerPage } from './pages/LessonPlayerPage'
import { LessonResultPage } from './pages/LessonResultPage'
import { ProfilePage } from './pages/ProfilePage'

function RootRedirect() {
  const onboardingDone = useUserStore((s) => s.onboardingDone)
  return <Navigate to={onboardingDone ? '/lessons' : '/onboarding'} replace />
}

function App() {
  useSyncLanguage()
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/lessons" element={<LessonsPage />} />
      <Route path="/lesson/:lessonId" element={<LessonPlayerPage />} />
      <Route path="/lesson/:lessonId/result" element={<LessonResultPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
