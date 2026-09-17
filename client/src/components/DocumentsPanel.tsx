import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  File,
  FileCode,
  FileText,
  FileType,
  Search,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import Button from './Button'
import EmptyState from './EmptyState'
import Panel from './Panel'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DocChunk, DocumentDetail, DocumentItem, FileStatus, PendingUpload } from '../types'

const ACCEPTED_TYPES = '.pdf,.txt,.md,.docx'
const PAGE_SIZE = 8
const CHUNK_PAGE_SIZE = 10

const PIPELINE_STEPS: { key: FileStatus | 'uploading'; label: string }[] = [
  { key: 'uploading', label: 'Read file' },
  { key: 'queued', label: 'Save to SQLite' },
  { key: 'chunking', label: 'Split into chunks' },
  { key: 'embedding', label: 'Create embeddings' },
  { key: 'ready', label: 'Ready to ask' },
]

const STEP_ORDER: Array<FileStatus | 'uploading'> = PIPELINE_STEPS.map((step) => step.key)

type SortKey = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'status' | 'chunks'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'status', label: 'Status' },
  { id: 'chunks', label: 'Most chunks' },
]

const STATUS_RANK: Record<FileStatus, number> = {
  ready: 0,
  embedding: 1,
  chunking: 2,
  queued: 3,
  error: 4,
}

type Props = {
  files: DocumentItem[]
  pending: PendingUpload[]
  selected: DocumentDetail | null
  selectedId: number | null
  docChunks: DocChunk[]
  uploading: boolean
  isDragging: boolean
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

function formatWhen(value: string | null) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function fileKind(name: string): { id: string; label: string; Icon: LucideIcon } {
  const ext = (name.split('.').pop() ?? '').toLowerCase()
  if (ext === 'pdf') return { id: 'pdf', label: 'PDF', Icon: FileText }
  if (ext === 'docx' || ext === 'doc') return { id: 'docx', label: 'Word', Icon: FileType }
  if (ext === 'md' || ext === 'markdown') return { id: 'md', label: 'Markdown', Icon: FileCode }
  if (ext === 'txt') return { id: 'txt', label: 'Text', Icon: File }
  return { id: 'file', label: ext ? ext.toUpperCase() : 'File', Icon: File }
}

function statusLabel(status: FileStatus | 'uploading') {
  if (status === 'ready') return 'Ready'
  if (status === 'error') return 'Failed'
  if (status === 'queued') return 'Queued'
  if (status === 'chunking') return 'Chunking'
  if (status === 'embedding') return 'Embedding'
  return 'Uploading'
}

function displayTitle(name: string) {
  const cut = name.lastIndexOf('.')
  if (cut <= 0) return name
  return name.slice(0, cut)
}

function stamp(item: DocumentItem) {
  if (!item.createdAt) return item.id
  const value = Date.parse(item.createdAt)
  return Number.isNaN(value) ? item.id : value
}

function sortFiles(files: DocumentItem[], sort: SortKey) {
  const next = [...files]
  next.sort((left, right) => {
    if (sort === 'newest') return stamp(right) - stamp(left)
    if (sort === 'oldest') return stamp(left) - stamp(right)
    if (sort === 'name-asc') return left.name.localeCompare(right.name)
    if (sort === 'name-desc') return right.name.localeCompare(left.name)
    if (sort === 'chunks') return right.chunks - left.chunks
    return STATUS_RANK[left.status] - STATUS_RANK[right.status] || left.name.localeCompare(right.name)
  })
  return next
}

function DocIdentity({
  name,
  createdAt,
  chunks,
  status,
  chevron,
}: {
  name: string
  createdAt: string | null
  chunks: number
  status: FileStatus | 'uploading'
  chevron?: boolean
}) {
  const kind = fileKind(name)
  const Glyph = kind.Icon
  return (
    <>
      <span className={`doc-mark is-${kind.id}`} aria-hidden>
        <Glyph size={22} strokeWidth={1.7} />
      </span>
      <div className="doc-card-copy">
        <p className="doc-card-title">{displayTitle(name)}</p>
        <p className="doc-card-file">{name}</p>
        <div className="doc-card-meta">
          <span>{formatWhen(createdAt)}</span>
          <span>
            {chunks} {chunks === 1 ? 'chunk' : 'chunks'}
          </span>
          <span className={`status status-${status}`}>{statusLabel(status)}</span>
        </div>
      </div>
      {chevron ? <ChevronRight className="doc-card-go" size={18} strokeWidth={1.8} /> : null}
    </>
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
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  onSelect,
  onClose,
  onRemove,
}: Props) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const [chunkPage, setChunkPage] = useState(1)
  const wasUploading = useRef(false)
  const sorted = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? files.filter((item) => item.name.toLowerCase().includes(needle))
      : files
    return sortFiles(filtered, sort)
  }, [files, query, sort])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sorted.length)
  const working = files.filter((item) => item.status !== 'ready' && item.status !== 'error')
  const liveText = [
    ...pending.map((item) => `${item.name}: reading file`),
    ...working.map((item) => `${item.name}: ${item.detail || item.status}`),
  ].join(' · ')

  useEffect(() => {
    setPage(1)
  }, [sort, files.length, query])

  useEffect(() => {
    setChunkPage(1)
  }, [selectedId])

  useEffect(() => {
    if (wasUploading.current && !uploading) setUploadOpen(false)
    wasUploading.current = uploading
  }, [uploading])

  useEffect(() => {
    if (!uploadOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !uploading) setUploadOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [uploadOpen, uploading])

  if (selectedId !== null) {
    const chunkPages = Math.max(1, Math.ceil(docChunks.length / CHUNK_PAGE_SIZE))
    const safeChunkPage = Math.min(chunkPage, chunkPages)
    const visibleChunks = docChunks.slice(
      (safeChunkPage - 1) * CHUNK_PAGE_SIZE,
      safeChunkPage * CHUNK_PAGE_SIZE,
    )
    return (
      <Panel title={selected?.name ?? 'Document'} className="docs-shell">
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <button type="button" className="crumb-link" onClick={onClose}>
                Documents
              </button>
            </li>
            <li className="crumb-sep" aria-hidden="true">
              <ChevronRight size={14} strokeWidth={2} />
            </li>
            <li className="crumb-current">{selected?.name ?? 'Opening…'}</li>
          </ol>
        </nav>
        {selected ? (
          <div className="docs-body">
            <div className="doc-page-head">
              <div className="doc-page-identity">
                <DocIdentity
                  name={selected.name}
                  createdAt={selected.createdAt}
                  chunks={selected.chunks}
                  status={selected.status}
                />
              </div>
              <Button variant="secondary" onClick={() => onRemove(selected.id)}>
                Remove
              </Button>
            </div>
            {selected.detail && selected.status !== 'ready' ? <p className="ingest-live glass">{selected.detail}</p> : null}
            {selected.status !== 'ready' && selected.status !== 'error' ? (
              <Pipeline status={selected.status} detail={selected.detail} />
            ) : null}
            {docChunks.length === 0 ? (
              <EmptyState>
                {selected.status === 'chunking' || selected.status === 'queued'
                  ? 'Chunks will appear as soon as splitting finishes.'
                  : 'No chunks yet.'}
              </EmptyState>
            ) : (
              <ul className="doc-chunk-list">
                {visibleChunks.map((chunk) => (
                  <li key={chunk.id} className="doc-chunk glass">
                    <span className="file-size">Chunk {chunk.position + 1}</span>
                    <p className="doc-chunk-text">{chunk.text}</p>
                  </li>
                ))}
              </ul>
            )}
            {docChunks.length > CHUNK_PAGE_SIZE ? (
              <div className="doc-pager">
                <p className="hint">
                  {(safeChunkPage - 1) * CHUNK_PAGE_SIZE + 1}–{Math.min(safeChunkPage * CHUNK_PAGE_SIZE, docChunks.length)} of {docChunks.length}
                </p>
                <div className="doc-pager-nav">
                  <Button
                    variant="ghost"
                    aria-label="Previous chunks"
                    disabled={safeChunkPage <= 1}
                    onClick={() => setChunkPage((value) => Math.max(1, value - 1))}
                  >
                    <ChevronLeft size={18} strokeWidth={2} />
                  </Button>
                  <span className="doc-pager-num">
                    {safeChunkPage} / {chunkPages}
                  </span>
                  <Button
                    variant="ghost"
                    aria-label="Next chunks"
                    disabled={safeChunkPage >= chunkPages}
                    onClick={() => setChunkPage((value) => Math.min(chunkPages, value + 1))}
                  >
                    <ChevronRight size={18} strokeWidth={2} />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState>Loading document…</EmptyState>
        )}
      </Panel>
    )
  }

  return (
    <Panel title={files.length > 0 ? `Documents (${files.length})` : 'Documents'} className="docs-shell">
      <div className="doc-toolbar">
        <label className="learn-search doc-search">
          <Search size={16} strokeWidth={1.8} />
          <input
            className="field-input"
            type="search"
            value={query}
            placeholder="Search by file name"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="doc-toolbar-actions">
          <div className="doc-sort-wrap">
            <span className="profile-label" id="doc-sort-label">
              Sort
            </span>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="doc-sort" aria-labelledby="doc-sort-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload size={16} strokeWidth={2} />
            Upload
          </Button>
        </div>
      </div>
      {liveText ? (
        <p className="ingest-live glass" aria-live="polite">
          {liveText}
        </p>
      ) : null}

      <div className="docs-body">
      {files.length === 0 && pending.length === 0 ? (
        <EmptyState>No documents yet. Upload a file to see it here.</EmptyState>
      ) : (
        <>
          <ul className="doc-cards">
            {pending.map((item) => (
              <li key={`pending-${item.name}`}>
                <div className={`doc-card glass is-${fileKind(item.name).id} is-busy`}>
                  <DocIdentity name={item.name} createdAt={null} chunks={0} status="uploading" />
                </div>
              </li>
            ))}
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`doc-card glass is-${fileKind(item.name).id}`}
                  title={item.name}
                  onClick={() => onSelect(item.id)}
                >
                  <DocIdentity
                    name={item.name}
                    createdAt={item.createdAt}
                    chunks={item.chunks}
                    status={item.status}
                    chevron
                  />
                </button>
              </li>
            ))}
          </ul>
          {sorted.length === 0 && query.trim() ? (
            <EmptyState>No documents match that name.</EmptyState>
          ) : null}
          {sorted.length > 0 ? (
            <div className="doc-pager">
              <p className="hint">
                {rangeStart}–{rangeEnd} of {sorted.length}
              </p>
              <div className="doc-pager-nav">
                <Button
                  variant="ghost"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronLeft size={18} strokeWidth={2} />
                </Button>
                <span className="doc-pager-num">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="ghost"
                  aria-label="Next page"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                >
                  <ChevronRight size={18} strokeWidth={2} />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
      </div>

      {uploadOpen ? (
        <div
          className="doc-modal-back"
          onClick={() => {
            if (!uploading) setUploadOpen(false)
          }}
        >
          <div
            className="doc-modal glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="doc-modal-head">
              <h3 id="upload-title">Upload document</h3>
              <Button variant="ghost" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Close
              </Button>
            </div>
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
          </div>
        </div>
      ) : null}
    </Panel>
  )
}

export default DocumentsPanel
