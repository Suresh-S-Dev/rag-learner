import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useInView } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Skeleton } from '@/components/ui/skeleton'

export type GalleryItem = {
  id: number
  src: string
  alt: string
}

type Slot =
  | { kind: 'pending'; key: string; ratio: number }
  | { kind: 'image'; item: GalleryItem }

type ImageGalleryProps = {
  items: GalleryItem[]
  pending?: File[]
  onRemove?: (id: number) => void
}

function splitColumns<T>(items: T[], count: number) {
  const columns: T[][] = Array.from({ length: count }, () => [])
  items.forEach((item, index) => {
    columns[index % count].push(item)
  })
  return columns
}

function useFileRatios(files: File[]) {
  const [ratios, setRatios] = useState<number[]>(() => files.map(() => 4 / 3))

  useEffect(() => {
    if (files.length === 0) {
      setRatios([])
      return
    }
    setRatios(files.map(() => 4 / 3))
    const urls = files.map((file) => URL.createObjectURL(file))
    let cancelled = false
    urls.forEach((url, index) => {
      const image = new Image()
      image.onload = () => {
        if (cancelled || image.naturalWidth === 0 || image.naturalHeight === 0) return
        setRatios((current) => {
          const next = [...current]
          next[index] = image.naturalWidth / image.naturalHeight
          return next
        })
      }
      image.src = url
    })
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  return ratios
}

export function ImageGallery({ items, pending = [], onRemove }: ImageGalleryProps) {
  const [open, setOpen] = useState<GalleryItem | null>(null)
  const pendingRatios = useFileRatios(pending)

  useEffect(() => {
    if (open && !items.some((item) => item.id === open.id)) setOpen(null)
  }, [items, open])
  const slots: Slot[] = [
    ...pending.map((file, index) => ({
      kind: 'pending' as const,
      key: `${file.name}-${file.size}-${index}`,
      ratio: pendingRatios[index] ?? 4 / 3,
    })),
    ...items.map((item) => ({ kind: 'image' as const, item })),
  ]
  const columns = splitColumns(slots, 3)

  return (
    <div className="relative flex w-full flex-col">
      <div className="mx-auto grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((column, col) =>
          column.length === 0 ? null : (
            <div key={col} className="grid gap-6">
              {column.map((slot) =>
                slot.kind === 'pending' ? (
                  <PendingImage key={slot.key} ratio={slot.ratio} />
                ) : (
                  <AnimatedImage
                    key={slot.item.id}
                    alt={slot.item.alt}
                    src={slot.item.src}
                    onOpen={() => setOpen(slot.item)}
                    onRemove={onRemove ? () => onRemove(slot.item.id) : undefined}
                  />
                ),
              )}
            </div>
          ),
        )}
      </div>
      {open ? <Lightbox item={open} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}

function PendingImage({ ratio }: { ratio: number }) {
  return (
    <AspectRatio
      ratio={ratio}
      className="bg-accent relative size-full overflow-hidden rounded-[var(--radius-md)] border"
    >
      <Skeleton className="size-full rounded-[var(--radius-md)]" />
    </AspectRatio>
  )
}

type AnimatedImageProps = {
  alt: string
  src: string
  onOpen: () => void
  onRemove?: () => void
}

function AnimatedImage({ alt, src, onOpen, onRemove }: AnimatedImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [isLoading, setIsLoading] = useState(true)
  const [ratio, setRatio] = useState(4 / 3)

  return (
    <div className="group relative">
      <AspectRatio
        ref={ref}
        ratio={ratio}
        className="bg-accent relative size-full overflow-hidden rounded-[var(--radius-md)] border"
      >
        {isLoading ? <Skeleton className="absolute inset-0 size-full rounded-[var(--radius-md)]" /> : null}
        <img
          alt={alt}
          src={src}
          className={cn(
            'relative size-full cursor-zoom-in rounded-[var(--radius-md)] object-cover opacity-0 transition-all duration-1000 ease-in-out',
            {
              'opacity-100': isInView && !isLoading,
            },
          )}
          onClick={onOpen}
          onLoad={(event) => {
            const image = event.currentTarget
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setRatio(image.naturalWidth / image.naturalHeight)
            }
            setIsLoading(false)
          }}
          loading="lazy"
        />
      </AspectRatio>
      {onRemove ? (
        <button
          type="button"
          className="btn btn-icon absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Remove ${alt}`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}

function Lightbox({ item, onClose }: { item: GalleryItem; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={item.alt} onClick={onClose}>
      <button type="button" className="btn btn-icon gallery-lightbox-close" aria-label="Close" onClick={onClose}>
        <X size={18} strokeWidth={2} />
      </button>
      <img className="gallery-lightbox-image" src={item.src} alt={item.alt} onClick={(event) => event.stopPropagation()} />
      <p className="gallery-lightbox-name">{item.alt}</p>
    </div>
  )
}
