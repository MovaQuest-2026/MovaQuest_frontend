import { Route, Routes } from 'react-router-dom'
import { StartScreen } from './components/StartScreen'
import { LanguageSelectScreen } from './components/LanguageSelectScreen'
import { WorldScreen } from './components/WorldScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartScreen />} />
      <Route path="/language" element={<LanguageSelectScreen />} />
      <Route path="/world/:cityId" element={<WorldScreen />} />
    </Routes>
  )
}

export default App
