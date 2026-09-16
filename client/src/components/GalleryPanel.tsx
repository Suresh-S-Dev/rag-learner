import type { ChangeEvent, DragEvent } from 'react'
import Button from './Button'
import EmptyState from './EmptyState'
import Panel from './Panel'
import { mediaUrl } from '../api/client'
import type { GalleryImage } from '../types'

const ACCEPTED_IMAGES = '.png,.jpg,.jpeg,.webp,.gif'

type Props = {
  images: GalleryImage[]
  uploading: boolean
  isDragging: boolean
  error: string
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemove: (id: number) => void
}

function GalleryPanel({
  images,
  uploading,
  isDragging,
  error,
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
      <p className="hint">Diagrams and screenshots from Learn also appear here.</p>
      {error ? <p className="error">{error}</p> : null}
      {images.length === 0 ? (
        <EmptyState>No images yet. Upload from here or attach one on a learning point.</EmptyState>
      ) : (
        <ul className="gallery-grid">
          {images.map((image) => (
            <li key={image.id} className="glass gallery-card">
              <img src={mediaUrl(image.url)} alt={image.name} />
              <div className="doc-view-head">
                <span className="file-name">{image.name}</span>
                <Button variant="secondary" onClick={() => onRemove(image.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default GalleryPanel
