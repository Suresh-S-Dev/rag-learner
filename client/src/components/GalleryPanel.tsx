import { useRef, type ChangeEvent } from 'react'
import { Plus } from 'lucide-react'
import Button from './Button'
import EmptyState from './EmptyState'
import Panel from './Panel'
import { ImageGallery } from '@/components/ui/image-gallery'
import { mediaUrl } from '../api/client'
import type { GalleryImage } from '../types'

const ACCEPTED_IMAGES = '.png,.jpg,.jpeg,.webp,.gif'

type Props = {
  images: GalleryImage[]
  pending: File[]
  uploading: boolean
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: (id: number) => void
}

function GalleryPanel({ images, pending, uploading, onInputChange, onRemove }: Props) {
  const picker = useRef<HTMLInputElement>(null)

  return (
    <Panel title="Gallery">
      <div className="gallery-toolbar">
        <input
          ref={picker}
          className="file-hidden"
          type="file"
          multiple
          accept={ACCEPTED_IMAGES}
          onChange={onInputChange}
          disabled={uploading}
        />
        <Button variant="primary" disabled={uploading} onClick={() => picker.current?.click()}>
          <Plus size={16} strokeWidth={2} />
          {uploading ? 'Adding…' : 'Add images'}
        </Button>
      </div>
      {images.length === 0 && pending.length === 0 ? (
        <EmptyState>No images yet.</EmptyState>
      ) : (
        <ImageGallery
          items={images.map((image) => ({
            id: image.id,
            src: mediaUrl(image.url),
            alt: image.name,
          }))}
          pending={pending}
          onRemove={onRemove}
        />
      )}
    </Panel>
  )
}

export default GalleryPanel
