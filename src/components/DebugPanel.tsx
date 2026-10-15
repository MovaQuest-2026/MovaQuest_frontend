import { useEffect, useState, type CSSProperties } from 'react'
import { skipStep } from '../game/quests/questEngine'
import { useGameStore } from '../store/useGameStore'

// Тільки для розробки: WorldScreen підключає панель через import.meta.env.DEV,
// тож у production-бандл вона не потрапляє. Стилі інлайн з тієї ж причини.
const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 50,
  width: 300,
  maxHeight: 'calc(100% - 32px)',
  overflowY: 'auto',
  padding: 12,
  borderRadius: 12,
  background: 'rgba(8, 6, 13, 0.92)',
  color: '#fff',
  font: '13px/1.4 ui-monospace, monospace',
  textAlign: 'left',
}
const rowStyle: CSSProperties = { display: 'flex', gap: 6, margin: '8px 0' }
const buttonStyle: CSSProperties = { padding: '4px 10px', fontSize: 13, borderRadius: 8 }

export default function DebugPanel() {
  const [open, setOpen] = useState(false)
  const flags = useGameStore((state) => state.flags)
  const questStep = useGameStore((state) => state.questStep)
  const gameClock = useGameStore((state) => state.gameClock)
  const currentZone = useGameStore((state) => state.currentZone)
  const cityConfig = useGameStore((state) => state.cityConfig)
  const [clock, setClock] = useState(gameClock)
  const [zoneId, setZoneId] = useState(currentZone ?? '')

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.code === 'Backquote') setOpen((value) => !value)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!open) return null

  function handleNextStep() {
    const state = useGameStore.getState()
    if (!state.questline) return
    const patch = skipStep(state.questline, state)
    if (patch) useGameStore.setState(patch)
  }

  function handleSetClock() {
    if (/^\d{2}:\d{2}$/.test(clock)) useGameStore.getState().setGameClock(clock)
  }

  function handleTeleport() {
    if (zoneId) useGameStore.getState().requestZone(zoneId)
  }

  return (
    <div className="debug-panel" style={panelStyle}>
      <strong>DebugPanel (`)</strong>
      <div>zone: {currentZone}</div>
      <div>step: {questStep}</div>
      <div>clock: {gameClock}</div>
      <div>trust: {String(flags.trust ?? 0)}</div>

      <div style={rowStyle}>
        <button type="button" style={buttonStyle} onClick={handleNextStep}>
          Наступний крок
        </button>
      </div>
      <div style={rowStyle}>
        <input
          value={clock}
          onChange={(event) => setClock(event.target.value)}
          style={{ width: 70 }}
          aria-label="gameClock"
        />
        <button type="button" style={buttonStyle} onClick={handleSetClock}>
          Встановити час
        </button>
      </div>
      <div style={rowStyle}>
        <select
          value={zoneId}
          onChange={(event) => setZoneId(event.target.value)}
          aria-label="zone"
        >
          {cityConfig?.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.id}
            </option>
          ))}
        </select>
        <button type="button" style={buttonStyle} onClick={handleTeleport}>
          Телепорт
        </button>
      </div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(flags, null, 1)}
      </pre>
    </div>
  )
}
