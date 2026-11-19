import { useId, useState } from 'react'

interface MultiSelectOption<T extends string> {
  value: T
  label: string
  /** Мова підпису (для читачів екрана). */
  lang?: string
}

interface MultiSelectProps<T extends string> {
  label: string
  values: T[]
  options: MultiSelectOption<T>[]
  /** Що показати, коли нічого не вибрано. */
  placeholder: string
  onToggle: (value: T) => void
}

/** Мультиселект: згорнутий показує вибране чипами, розгорнутий — список із прапорцями (розкривається на місці). */
export function MultiSelect<T extends string>({ label, values, options, placeholder, onToggle }: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selected = options.filter((o) => values.includes(o.value))

  return (
    <div className={`multi-select${open ? ' multi-select--open' : ''}`}>
      <button
        type="button"
        className="multi-select__head"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="multi-select__chips">
          {selected.length === 0 ? (
            <span className="multi-select__placeholder">{placeholder}</span>
          ) : (
            selected.map((o) => (
              <span key={o.value} className="multi-select__chip" lang={o.lang}>
                {o.label}
              </span>
            ))
          )}
        </span>
        <svg className="multi-select__chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id={listId} className="multi-select__list" role="group" aria-label={label}>
          {options.map((o) => (
            <label key={o.value} className="multi-select__option">
              <input
                type="checkbox"
                className="multi-select__checkbox"
                checked={values.includes(o.value)}
                onChange={() => onToggle(o.value)}
              />
              <span lang={o.lang}>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
