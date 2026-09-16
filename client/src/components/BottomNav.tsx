import AppIcon from './Icon'
import type { TabId } from '../types'

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'documents', label: 'Documents' },
  { id: 'learn', label: 'Learn' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'profile', label: 'Profile' },
]

type Props = {
  current: TabId
  busy?: boolean
  onChange: (tab: TabId) => void
}

function BottomNav({ current, busy = false, onChange }: Props) {
  return (
    <nav className="bottom-nav glass" aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.id === current
        const showDot = tab.id === 'documents' && busy
        return (
          <button
            key={tab.id}
            type="button"
            className={`nav-item${active ? ' is-active' : ''}`}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(tab.id)}
          >
            <span className="nav-icon">
              <AppIcon name={tab.id} active={active} />
              {showDot ? <span className="nav-dot" /> : null}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
