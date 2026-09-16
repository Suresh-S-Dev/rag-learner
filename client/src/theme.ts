import type { Theme, ThemeMode } from './types'

const MODE_KEY = 'theme-mode'

export function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode): Theme {
  return mode === 'system' ? getSystemTheme() : mode
}

export function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem(MODE_KEY)
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  const legacy = localStorage.getItem('theme')
  if (legacy === 'light' || legacy === 'dark') return legacy
  return 'system'
}

export function persistThemeMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode)
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function getInitialTheme(): Theme {
  return resolveTheme(getInitialThemeMode())
}
