import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from '@/lib/toast'
import type { ThemeMode } from '../types'

const OPTIONS: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'system', label: 'System', Icon: Monitor },
  { id: 'dark', label: 'Dark', Icon: Moon },
]

type Props = {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}

function ThemeToggle({ mode, onChange }: Props) {
  return (
    <div className="theme-switch" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ id, label, Icon }) => {
        const selected = mode === id
        return (
          <button
            key={id}
            type="button"
            className={`theme-option${selected ? ' is-selected' : ''}`}
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (selected) return
              onChange(id)
              toast.success(`${label} appearance`)
            }}
          >
            <Icon size={15} strokeWidth={2} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle
