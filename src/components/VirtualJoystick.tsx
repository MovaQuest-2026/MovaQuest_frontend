import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useGameStore } from '../store/useGameStore'

const KNOB_TRAVEL_RATIO = 0.5

// Віртуальний джойстик для тач-екранів: пише в стор joystick {x, y} у діапазоні −1..1.
export function VirtualJoystick() {
  const [isTouch] = useState(
    () => window.matchMedia('(pointer: coarse)').matches,
  )
  const blocked = useGameStore(
    (state) =>
      state.activeDialogue !== null ||
      state.activeExercise !== null ||
      state.pendingCutscene !== null ||
      state.pendingExit !== null,
  )
  const setJoystick = useGameStore((state) => state.setJoystick)
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  // Відкритий діалог чи вправа обриває рух, щоб гравець не поїхав після закриття.
  useEffect(() => {
    if (!blocked) return
    pointerIdRef.current = null
    setJoystick({ x: 0, y: 0 })
  }, [blocked, setJoystick])

  useEffect(() => () => setJoystick({ x: 0, y: 0 }), [setJoystick])

  if (!isTouch || blocked) return null

  function update(event: PointerEvent<HTMLDivElement>) {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const radius = rect.width / 2
    let dx = (event.clientX - (rect.left + radius)) / radius
    let dy = (event.clientY - (rect.top + radius)) / radius
    const length = Math.hypot(dx, dy)
    if (length > 1) {
      dx /= length
      dy /= length
    }
    setKnob({ x: dx * radius * KNOB_TRAVEL_RATIO, y: dy * radius * KNOB_TRAVEL_RATIO })
    setJoystick({ x: dx, y: dy })
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    update(event)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current === event.pointerId) update(event)
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== event.pointerId) return
    pointerIdRef.current = null
    setKnob({ x: 0, y: 0 })
    setJoystick({ x: 0, y: 0 })
  }

  return (
    <div
      ref={baseRef}
      className="joystick"
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        className="joystick-knob"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
