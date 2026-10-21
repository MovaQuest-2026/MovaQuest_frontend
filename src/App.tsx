import { Route, Routes } from 'react-router-dom'
import { StartScreen } from './components/StartScreen'
import { LanguageSelectScreen } from './components/LanguageSelectScreen'
import { WorldScreen } from './components/WorldScreen'
import { CreditsScreen } from './components/CreditsScreen'
import { LevelSelectScreen } from './components/LevelSelectScreen'
import { LevelEntryScreen } from './components/LevelEntryScreen'
import { LandingPage } from './landing/LandingPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/play" element={<StartScreen />} />
      <Route path="/language" element={<LanguageSelectScreen />} />
      <Route path="/levels" element={<LevelSelectScreen />} />
      <Route path="/levels/:levelId" element={<LevelEntryScreen />} />
      <Route path="/world/:cityId" element={<WorldScreen />} />
      <Route path="/credits" element={<CreditsScreen />} />
    </Routes>
  )
}

export default App
