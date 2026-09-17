import type { ChangeEvent, DragEvent } from 'react'
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
  isDragging: boolean
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: (id: number) => void
}

function GalleryPanel({
  images,
  pending,
  uploading,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  onRemove,
}: Props) {
  return (
    <Panel title="Gallery">
      <label
        className={`dropzone glass${isDragging ? ' is-dragging' : ''}${uploading ? ' is-disabled' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_IMAGES}
          onChange={onInputChange}
          disabled={uploading}
        />
        <span>{uploading ? 'Uploading images…' : 'Drop images here, or click to browse'}</span>
        <span className="hint">PNG, JPG, WEBP, or GIF</span>
      </label>
      {images.length === 0 && pending.length === 0 ? (
        <EmptyState>No images yet. Upload from here.</EmptyState>
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
