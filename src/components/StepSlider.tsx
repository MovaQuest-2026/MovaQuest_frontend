import type { CSSProperties } from 'react'

interface StepSliderProps<T extends string | number> {
  label: string
  value: T
  /** Значення поділок по порядку; повзунок зупиняється лише на них. */
  steps: readonly T[]
  format: (value: T) => string
  onChange: (value: T) => void
}

/** Повзунок, що рухається лише поділками: підпис поточного значення над повзунком, поділки крапками на доріжці. */
export function StepSlider<T extends string | number>({ label, value, steps, format, onChange }: StepSliderProps<T>) {
  const index = Math.max(0, steps.indexOf(value))
  const last = steps.length - 1
  const frac = last > 0 ? index / last : 0

  return (
    <div className="step-slider" style={{ '--pos': `${frac * 100}%`, '--frac': frac } as CSSProperties}>
      <span className="step-slider__value" aria-hidden="true">
        {format(steps[index])}
      </span>
      <input
        className="step-slider__input"
        type="range"
        min={0}
        max={last}
        step={1}
        value={index}
        aria-label={label}
        aria-valuetext={format(steps[index])}
        onChange={(e) => onChange(steps[Number(e.target.value)])}
      />
      <div className="step-slider__ticks" aria-hidden="true">
        {steps.map((s, i) => (
          <span
            key={String(s)}
            className={`step-slider__tick${i <= index ? ' step-slider__tick--filled' : ''}`}
            style={{ left: `${last > 0 ? (i / last) * 100 : 0}%` }}
          />
        ))}
      </div>
    </div>
  )
}
