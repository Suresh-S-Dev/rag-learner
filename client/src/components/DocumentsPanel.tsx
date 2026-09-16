import type { ChangeEvent, DragEvent } from 'react'
import Button from './Button'
import EmptyState from './EmptyState'
import Panel from './Panel'
import type { DocChunk, DocumentDetail, DocumentItem, FileStatus, PendingUpload } from '../types'

const ACCEPTED_TYPES = '.pdf,.txt,.md,.docx'

const PIPELINE_STEPS: { key: FileStatus | 'uploading'; label: string }[] = [
  { key: 'uploading', label: 'Read file' },
  { key: 'queued', label: 'Save to SQLite' },
  { key: 'chunking', label: 'Split into chunks' },
  { key: 'embedding', label: 'Create embeddings' },
  { key: 'ready', label: 'Ready to ask' },
]

const STEP_ORDER: Array<FileStatus | 'uploading'> = PIPELINE_STEPS.map((step) => step.key)

type Props = {
  files: DocumentItem[]
  pending: PendingUpload[]
  selected: DocumentDetail | null
  selectedId: number | null
  docChunks: DocChunk[]
  uploading: boolean
  isDragging: boolean
  error: string
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void
  onDragLeave: () => void
  onDrop: (event: DragEvent<HTMLLabelElement>) => void
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSelect: (id: number) => void
  onClose: () => void
  onRemove: (id: number) => void
}

function stepState(current: FileStatus | 'uploading', step: FileStatus | 'uploading') {
  if (current === 'error') return 'error'
  const currentIndex = STEP_ORDER.indexOf(current)
  const stepIndex = STEP_ORDER.indexOf(step)
  if (currentIndex > stepIndex) return 'done'
  if (currentIndex === stepIndex) return 'current'
  return 'todo'
}

function Pipeline({ status, detail }: { status: FileStatus | 'uploading'; detail?: string | null }) {
  return (
    <ol className="pipeline">
      {PIPELINE_STEPS.map((step) => {
        const state = stepState(status, step.key)
        const isCurrent = state === 'current'
        return (
          <li key={step.key} className={`pipeline-step is-${state}`}>
            <span>{step.label}</span>
            {isCurrent && detail ? <span className="pipeline-detail">{detail}</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

function DocumentsPanel({
  files,
  pending,
  selected,
  selectedId,
  docChunks,
  uploading,
  isDragging,
  error,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  onSelect,
  onClose,
  onRemove,
}: Props) {
  const working = files.filter((item) => item.status !== 'ready' && item.status !== 'error')
  const liveText = [
    ...pending.map((item) => `${item.name}: reading file`),
    ...working.map((item) => `${item.name}: ${item.detail || item.status}`),
  ].join(' · ')
  const title = files.length > 0 ? `Documents (${files.length})` : 'Documents'

  return (
    <Panel title={title}>
      <label
        className={`dropzone glass${isDragging ? ' is-dragging' : ''}${uploading ? ' is-disabled' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={onInputChange}
          disabled={uploading}
        />
        <span>{uploading ? 'Reading and saving files…' : 'Drop files here, or click to browse'}</span>
        <span className="hint">
          {pending.length > 0 ? pending.map((item) => item.name).join(', ') : 'PDF, TXT, MD, or DOCX'}
        </span>
      </label>
      <p className="hint">Files are stored in SQLite on the server, then chunked and embedded with Bedrock.</p>
      {liveText ? (
        <p className="ingest-live glass" aria-live="polite">
          {liveText}
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      {files.length === 0 && pending.length === 0 ? (
        <EmptyState>No documents yet. Upload a file to see it here.</EmptyState>
      ) : (
        <>
          <p className="hint">Click a document to read it and its chunks below.</p>
          <ul className="file-list">
            {pending.map((item) => (
              <li key={`pending-${item.name}`} className="glass is-busy">
                <div className="file-row">
                  <span className="file-name">{item.name}</span>
                  <span className="status status-uploading">Reading</span>
                </div>
                <Pipeline status="uploading" detail="Reading file and extracting text" />
              </li>
            ))}
            {files.map((item) => (
              <li
                key={item.id}
                className={`glass${item.id === selectedId ? ' is-selected' : ''}${item.status !== 'ready' && item.status !== 'error' ? ' is-busy' : ''}`}
              >
                <div className="file-row">
                  <button type="button" className="file-open" onClick={() => onSelect(item.id)}>
                    <span className="file-name">{item.name}</span>
                    <span className="file-meta">
                      <span className="file-size">{item.chunks} chunks</span>
                      <span className={`status status-${item.status}`}>{item.status}</span>
                    </span>
                  </button>
                  <Button variant="secondary" onClick={() => onRemove(item.id)}>
                    Remove
                  </Button>
                </div>
                {item.status !== 'ready' ? (
                  <>
                    <Pipeline status={item.status} detail={item.detail} />
                    {item.error ? <p className="error">{item.error}</p> : null}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="doc-view">
        <h3>Document text</h3>
        {selected ? (
          <>
            <div className="doc-view-head">
              <p className="file-name">{selected.name}</p>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
            {selected.detail && selected.status !== 'ready' ? <p className="ingest-live glass">{selected.detail}</p> : null}
            {selected.error ? <p className="error">{selected.error}</p> : null}
            {selected.text ? (
              <pre className="doc-text glass">{selected.text}</pre>
            ) : (
              <EmptyState>No text could be extracted from this file.</EmptyState>
            )}
            <h3>Chunks</h3>
            {docChunks.length === 0 ? (
              <EmptyState>
                {selected.status === 'chunking' || selected.status === 'queued'
                  ? 'Chunks will appear as soon as splitting finishes.'
                  : 'No chunks yet.'}
              </EmptyState>
            ) : (
              <ul className="chunk-list">
                {docChunks.map((chunk) => (
                  <li key={chunk.id}>
                    <span className="file-size">#{chunk.position + 1}</span>
                    <pre className="doc-text glass">{chunk.text}</pre>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <EmptyState>Select a document from the list to read it here.</EmptyState>
        )}
      </div>
    </Panel>
  )
}

export default DocumentsPanel
