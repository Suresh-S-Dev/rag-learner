import type { ReactNode } from 'react'

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export default EmptyState
