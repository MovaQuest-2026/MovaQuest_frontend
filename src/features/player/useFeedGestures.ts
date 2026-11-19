import { useEffect, useRef, type MouseEvent, type PointerEvent, type WheelEvent } from 'react'
import type { FeedDirection } from './useLessonFeed'

/** Скільки пікселів руху потрібно, щоб жест вважався перетягуванням, а не дотиком. */
const DRAG_START_PX = 16
/** Відпускання далі ніж ця частка висоти екрана гортає сторінку. */
const COMMIT_FRACTION = 0.2
/** Або швидкий помах (px/мс) на відстань не менше COMMIT_FLICK_MIN_PX. */
const COMMIT_VELOCITY = 0.45
const COMMIT_FLICK_MIN_PX = 24
/** На краях стрічки (немає сусіда) сторінка тягнеться «з опором». */
const EDGE_RESISTANCE = 0.3
/** Швидкість рахуємо за останні мілісекунди руху. */
const VELOCITY_WINDOW_MS = 120
const WHEEL_MIN = 60
const WHEEL_COOLDOWN_MS = 900
/** Зони, де вертикальний жест належить самому елементу (скрол фраз, повзунок, кнопки). */
const IGNORE = '.gap-panel, .player-controls, .player-topbar, .dev-panel, .action-rail, .comments-sheet, .result-modal, .signin-prompt'

interface FeedGestureOptions {
  /** Чи є сусідній урок у цьому напрямку. */
  canGo: (dir: FeedDirection) => boolean
  /** Сторінка йде за пальцем: зсув у пікселях (від'ємний — угору, до наступного уроку). */
  onDrag: (offset: number) => void
  /** Жест завершено перегортанням (або клавіші й коліщатко з offset 0). */
  onCommit: (dir: FeedDirection, offset: number) => void
  /** Палець відпустили без перегортання: повернути сторінку на місце. */
  onCancel: (offset: number) => void
}

interface Drag {
  x: number
  y: number
  dragging: boolean
  samples: { y: number; t: number }[]
}

/**
 * Жести стрічки: сторінка йде за пальцем; далі перегортання (за відстанню або швидкістю помаху) чи повернення.
 * Свайп угору — наступний урок, вниз — попередній. На десктопі те саме коліщатком миші і стрілками ↑/↓.
 */
export function useFeedGestures(options: FeedGestureOptions) {
  const drag = useRef<Drag | null>(null)
  const swiped = useRef(false)
  const wheel = useRef({ sum: 0, lockedUntil: 0 })
  const opts = useRef(options)
  useEffect(() => {
    opts.current = options
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown') opts.current.onCommit('next', 0)
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') opts.current.onCommit('prev', 0)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const offsetFor = (dy: number): number => (opts.current.canGo(dy < 0 ? 'next' : 'prev') ? dy : dy * EDGE_RESISTANCE)

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      swiped.current = false
      if ((e.target as HTMLElement).closest(IGNORE)) return
      drag.current = { x: e.clientX, y: e.clientY, dragging: false, samples: [{ y: e.clientY, t: e.timeStamp }] }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.dragging) {
        if (Math.abs(dy) < DRAG_START_PX || Math.abs(dy) < Math.abs(dx) * 1.5) return
        d.dragging = true
        swiped.current = true
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          // Без захоплення жест працює, поки палець над сторінкою.
        }
      }
      d.samples.push({ y: e.clientY, t: e.timeStamp })
      while (d.samples.length > 2 && e.timeStamp - d.samples[0].t > VELOCITY_WINDOW_MS) d.samples.shift()
      opts.current.onDrag(offsetFor(dy))
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const d = drag.current
      drag.current = null
      if (!d?.dragging) return
      const dy = e.clientY - d.y
      const dir: FeedDirection = dy < 0 ? 'next' : 'prev'
      const first = d.samples[0]
      const last = d.samples[d.samples.length - 1]
      const velocity = last.t > first.t ? Math.abs(last.y - first.y) / (last.t - first.t) : 0
      // Помах у протилежний бік від початкового зсуву не перегортає.
      const flickDir = last.y === first.y ? dir : last.y < first.y ? 'next' : 'prev'
      const far = Math.abs(dy) > e.currentTarget.clientHeight * COMMIT_FRACTION
      const flick = velocity > COMMIT_VELOCITY && Math.abs(dy) > COMMIT_FLICK_MIN_PX && flickDir === dir
      if (opts.current.canGo(dir) && (far || flick)) opts.current.onCommit(dir, offsetFor(dy))
      else opts.current.onCancel(offsetFor(dy))
    },
    onPointerCancel: () => {
      const d = drag.current
      drag.current = null
      if (d?.dragging) opts.current.onCancel(0)
    },
    // Після перетягування браузер ще шле click — він не має ставити паузу чи перемотувати.
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
      opts.current.onCommit(dir, 0)
    },
  }
}
