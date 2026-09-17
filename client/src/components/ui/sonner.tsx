import type { CSSProperties } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ theme = 'system', ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-center"
      closeButton
      style={
        {
          '--normal-bg': 'var(--surface-strong)',
          '--normal-text': 'var(--text-h)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--surface-strong)',
          '--success-text': 'var(--success)',
          '--error-bg': 'var(--surface-strong)',
          '--error-text': 'var(--danger)',
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
