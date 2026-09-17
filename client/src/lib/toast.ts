import { toast } from 'sonner'

export function toastFromError(err: unknown, fallback: string) {
  toast.error(err instanceof Error ? err.message : fallback)
}

export { toast }
