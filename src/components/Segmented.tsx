interface SegmentedOption<T extends string | number> {
  value: T
  label: string
}

interface SegmentedProps<T extends string | number> {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  columns?: 2
  /** Вужчі кнопки, щоб три довгі підписи влізли в рядок на 360px. */
  compact?: boolean
}

export function Segmented<T extends string | number>({ label, value, options, onChange, columns, compact }: SegmentedProps<T>) {
  const className = ['segmented', columns && 'segmented--grid', compact && 'segmented--compact'].filter(Boolean).join(' ')
  return (
    <div className={className} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="segmented__item"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
