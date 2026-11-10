import { useEffect, useRef, type MouseEvent, type PointerEvent, type WheelEvent } from 'react'
import type { FeedDirection } from './useLessonFeed'

const SWIPE_MIN_PX = 60
const WHEEL_MIN = 60
const WHEEL_COOLDOWN_MS = 900
/** Зони, де вертикальний жест належить самому елементу (скрол фраз, повзунок, кнопки). */
const IGNORE = '.choice-panel, .player-controls, .player-topbar, .dev-panel'

/**
 * Жести стрічки: свайп угору — наступний урок, вниз — попередній.
 * На десктопі те саме коліщатком миші і стрілками ↑/↓.
 */
export function useFeedGestures(onSwipe: (dir: FeedDirection) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)
  const wheel = useRef({ sum: 0, lockedUntil: 0 })
  const handler = useRef(onSwipe)
  useEffect(() => {
    handler.current = onSwipe
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') handler.current('next')
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') handler.current('prev')
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest(IGNORE)) return
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const s = start.current
      start.current = null
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dy) < SWIPE_MIN_PX || Math.abs(dy) < Math.abs(dx) * 1.5) return
      swiped.current = true
      handler.current(dy < 0 ? 'next' : 'prev')
    },
    onPointerCancel: () => {
      start.current = null
    },
    // Після свайпу браузер ще шле click — він не має ставити паузу чи перемотувати.
    onClickCapture: (e: MouseEvent<HTMLElement>) => {
      if (!swiped.current) return
      swiped.current = false
      e.preventDefault()
      e.stopPropagation()
    },
    onWheel: (e: WheelEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest(IGNORE)) return
      const w = wheel.current
      const now = performance.now()
      if (now < w.lockedUntil) return
      w.sum += e.deltaY
      if (Math.abs(w.sum) < WHEEL_MIN) return
      const dir: FeedDirection = w.sum > 0 ? 'next' : 'prev'
      w.sum = 0
      w.lockedUntil = now + WHEEL_COOLDOWN_MS
      handler.current(dir)
    },
  }
}
