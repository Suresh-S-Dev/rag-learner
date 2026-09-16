import { useState, type ChangeEvent } from 'react'
import { Pencil } from 'lucide-react'
import Avatar from './Avatar'
import Button from './Button'
import Panel from './Panel'
import ThemeToggle from './ThemeToggle'
import { DEFAULT_PROFILE, readAvatar } from '../profile'
import type { Profile, Theme, ThemeMode } from '../types'

type Props = {
  theme: Theme
  themeMode: ThemeMode
  profile: Profile
  onThemeMode: (mode: ThemeMode) => void
  onSave: (profile: Profile) => void
}

type CardProps = {
  variant: 'user' | 'assistant'
  title: string
  name: string
  avatar: string
  placeholder: string
  error: string
  dirty: boolean
  onNameChange: (value: string) => void
  onPhoto: (event: ChangeEvent<HTMLInputElement>) => void
  onApply: () => void
}

function IdentityCard({
  variant,
  title,
  name,
  avatar,
  placeholder,
  error,
  dirty,
  onNameChange,
  onPhoto,
  onApply,
}: CardProps) {
  const display = name.trim() || placeholder
  return (
    <section className={`profile-card glass is-${variant}`}>
      <div className="profile-banner" />
      <div className="profile-card-body">
        <label className="avatar-pick" aria-label={`Change ${title.toLowerCase()} photo`}>
          <Avatar name={display} src={avatar} size="lg" />
          <span className="avatar-edit">
            <Pencil size={12} strokeWidth={2.2} />
          </span>
          <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif" onChange={onPhoto} />
        </label>
        <h3 className="profile-display-name">{display}</h3>
        <p className="profile-role">{title}</p>
        <label className="profile-fields">
          <span className="profile-label">Name</span>
          <input
            className="field-input glass"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={placeholder}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <Button type="button" variant="primary" block disabled={!dirty} onClick={onApply}>
          Apply
        </Button>
      </div>
    </section>
  )
}

function ProfilePanel({ theme, themeMode, profile, onThemeMode, onSave }: Props) {
  const [userName, setUserName] = useState(profile.userName)
  const [assistantName, setAssistantName] = useState(profile.assistantName)
  const [userAvatar, setUserAvatar] = useState(profile.userAvatar)
  const [assistantAvatar, setAssistantAvatar] = useState(profile.assistantAvatar)
  const [userError, setUserError] = useState('')
  const [assistantError, setAssistantError] = useState('')
  const userDirty = userName.trim() !== profile.userName || userAvatar !== profile.userAvatar
  const assistantDirty = assistantName.trim() !== profile.assistantName || assistantAvatar !== profile.assistantAvatar

  async function onPhoto(event: ChangeEvent<HTMLInputElement>, who: 'user' | 'assistant') {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const src = await readAvatar(file)
      if (who === 'user') {
        setUserAvatar(src)
        setUserError('')
      } else {
        setAssistantAvatar(src)
        setAssistantError('')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read image'
      if (who === 'user') setUserError(message)
      else setAssistantError(message)
    }
  }

  function applyUser() {
    const nextName = userName.trim() || DEFAULT_PROFILE.userName
    setUserName(nextName)
    onSave({
      userName: nextName,
      userAvatar,
      assistantName: profile.assistantName,
      assistantAvatar: profile.assistantAvatar,
    })
  }

  function applyAssistant() {
    const nextName = assistantName.trim() || DEFAULT_PROFILE.assistantName
    setAssistantName(nextName)
    onSave({
      userName: profile.userName,
      userAvatar: profile.userAvatar,
      assistantName: nextName,
      assistantAvatar,
    })
  }

  return (
    <Panel title="Profile" className="profile-shell">
      <section className="appearance-card glass">
        <div className="appearance-copy">
          <h3 className="profile-heading">Appearance</h3>
          <p className="hint">
            {themeMode === 'system'
              ? `Follows your device · ${theme === 'dark' ? 'Dark' : 'Light'}`
              : themeMode === 'dark'
                ? 'Dark theme'
                : 'Light theme'}
          </p>
        </div>
        <ThemeToggle mode={themeMode} onChange={onThemeMode} />
      </section>
      <div className="profile-grid">
        <IdentityCard
          variant="user"
          title="User"
          name={userName}
          avatar={userAvatar}
          placeholder="Your name"
          error={userError}
          dirty={userDirty}
          onNameChange={setUserName}
          onPhoto={(event) => void onPhoto(event, 'user')}
          onApply={applyUser}
        />
        <IdentityCard
          variant="assistant"
          title="Assistant"
          name={assistantName}
          avatar={assistantAvatar}
          placeholder="Assistant name"
          error={assistantError}
          dirty={assistantDirty}
          onNameChange={setAssistantName}
          onPhoto={(event) => void onPhoto(event, 'assistant')}
          onApply={applyAssistant}
        />
      </div>
    </Panel>
  )
}

export default ProfilePanel
