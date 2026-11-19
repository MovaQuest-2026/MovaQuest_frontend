import type { ThemePreference } from '../store/useUserStore'

interface ThemePickerProps {
  label: string
  value: ThemePreference
  options: { value: ThemePreference; label: string }[]
  onChange: (value: ThemePreference) => void
}

/** Вибір теми: мініатюра екрана в кожній темі й радіокнопка під нею. Системна — половина світлої, половина темної. */
export function ThemePicker({ label, value, options, onChange }: ThemePickerProps) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="theme-picker__option">
          <input
            type="radio"
            className="theme-picker__radio"
            name="theme"
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span className={`theme-preview theme-preview--${o.value}`} aria-hidden="true">
            <span className="theme-preview__line" />
            <span className="theme-preview__line theme-preview__line--short" />
            <span className="theme-preview__line" />
            <span className="theme-preview__button" />
          </span>
          <span className="theme-picker__label">
            <span className="theme-picker__dot" aria-hidden="true" />
            {o.label}
          </span>
        </label>
      ))}
    </div>
  )
}
