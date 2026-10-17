import { Route, Routes } from 'react-router-dom'
import { StartScreen } from './components/StartScreen'
import { LanguageSelectScreen } from './components/LanguageSelectScreen'
import { WorldScreen } from './components/WorldScreen'
import { CreditsScreen } from './components/CreditsScreen'
import { LandingPage } from './landing/LandingPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/play" element={<StartScreen />} />
      <Route path="/language" element={<LanguageSelectScreen />} />
      <Route path="/world/:cityId" element={<WorldScreen />} />
      <Route path="/credits" element={<CreditsScreen />} />
    </Routes>
  )
}

export default App
