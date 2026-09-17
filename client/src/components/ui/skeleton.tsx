import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-accent animate-pulse rounded-[var(--radius-md)]', className)} {...props} />
}

export { Skeleton }
