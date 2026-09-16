import { useCallback, useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import {
  askQuestion,
  createLearnPoint,
  deleteDocument,
  deleteGalleryImage,
  deleteLearnPoint,
  getDocument,
  getDocumentChunks,
  ingestFiles,
  listDocuments,
  listGallery,
  listLearnPoints,
  suggestQuestions,
  uploadGallery,
} from './api/client'
import ChatPanel from './components/ChatPanel'
import Atmosphere from './components/Atmosphere'
import BottomNav from './components/BottomNav'
import DocumentsPanel from './components/DocumentsPanel'
import GalleryPanel from './components/GalleryPanel'
import LearnPanel from './components/LearnPanel'
import ProfilePanel from './components/ProfilePanel'
import { loadProfile, saveProfile } from './profile'
import { applyTheme, getInitialThemeMode, getSystemTheme, persistThemeMode, resolveTheme } from './theme'
import type {
  ChatMessage,
  DocChunk,
  DocumentDetail,
  DocumentItem,
  GalleryImage,
  LearnPoint,
  PendingUpload,
  Profile,
  RetrievedChunk,
  TabId,
  ThemeMode,
} from './types'
import './App.css'

const QUESTION_KEY = 'rag-learner-question'

function loadQuestion(): string {
  return localStorage.getItem(QUESTION_KEY) ?? ''
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)
  const theme = resolveTheme(themeMode)
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const persistProfile = useCallback((next: Profile) => {
    setProfile(next)
    saveProfile(next)
  }, [])
  const [tab, setTab] = useState<TabId>('home')
  const [files, setFiles] = useState<DocumentItem[]>([])
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [galleryDragging, setGalleryDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [learnSaving, setLearnSaving] = useState(false)
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState(loadQuestion)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeChunks, setActiveChunks] = useState<RetrievedChunk[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<DocumentDetail | null>(null)
  const [docChunks, setDocChunks] = useState<DocChunk[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [points, setPoints] = useState<LearnPoint[]>([])
  const selectedMeta = files.find((item) => item.id === selectedId)
  const busy =
    uploading ||
    pending.length > 0 ||
    files.some((item) => item.status === 'queued' || item.status === 'chunking' || item.status === 'embedding')
  const readyKey = files
    .filter((item) => item.status === 'ready')
    .map((item) => item.id)
    .join(',')
  const canAsk = files.some((item) => item.status === 'ready') && !asking && !uploading

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    persistThemeMode(themeMode)
  }, [themeMode])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (themeMode === 'system') applyTheme(getSystemTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [themeMode])

  useEffect(() => {
    localStorage.setItem(QUESTION_KEY, question)
  }, [question])

  useEffect(() => {
    if (files.length === 0 && pending.length === 0 && !uploading) {
      setMessages([])
      setActiveChunks([])
      setSuggestions([])
    }
  }, [files.length, pending.length, uploading])

  async function loadDocuments() {
    try {
      const payload = await listDocuments()
      setFiles(payload.files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load documents')
    }
  }

  async function loadGallery() {
    try {
      const payload = await listGallery()
      setImages(payload.images)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load gallery')
    }
  }

  async function loadLearn() {
    try {
      const payload = await listLearnPoints()
      setPoints(payload.points)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load learning points')
    }
  }

  useEffect(() => {
    if (!readyKey) {
      setSuggestions([])
      return
    }
    let cancelled = false
    setSuggesting(true)
    void (async () => {
      try {
        const payload = await suggestQuestions()
        if (!cancelled) setSuggestions((payload.questions ?? []).slice(0, 3))
      } catch {
        if (!cancelled) setSuggestions([])
      } finally {
        if (!cancelled) setSuggesting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [readyKey])

  useEffect(() => {
    void loadDocuments()
    void loadGallery()
    void loadLearn()
  }, [])

  useEffect(() => {
    if (!busy) return
    const timer = window.setInterval(() => {
      void loadDocuments()
    }, 700)
    return () => window.clearInterval(timer)
  }, [busy])

  useEffect(() => {
    if (selectedId === null) {
      setSelected(null)
      setDocChunks([])
      return
    }
    void (async () => {
      try {
        const [doc, chunks] = await Promise.all([getDocument(selectedId), getDocumentChunks(selectedId)])
        setSelected(doc)
        setDocChunks(chunks.chunks)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load document')
      }
    })()
  }, [selectedId, selectedMeta?.status, selectedMeta?.chunks, selectedMeta?.detail])

  async function addFiles(incoming: FileList | File[]) {
    const incomingFiles = Array.from(incoming)
    if (!incomingFiles.length) return
    setUploading(true)
    setPending(incomingFiles.map((file) => ({ name: file.name })))
    setError('')
    try {
      await ingestFiles(incomingFiles)
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the API. Is the server running on port 8005?')
    } finally {
      setPending([])
      setUploading(false)
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addFiles(event.target.files)
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (!uploading && event.dataTransfer.files.length) void addFiles(event.dataTransfer.files)
  }

  async function addImages(incoming: FileList | File[]) {
    const incomingFiles = Array.from(incoming)
    if (!incomingFiles.length) return
    setGalleryUploading(true)
    setError('')
    try {
      await uploadGallery(incomingFiles)
      await loadGallery()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload images')
    } finally {
      setGalleryUploading(false)
    }
  }

  function onGalleryInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addImages(event.target.files)
    event.target.value = ''
  }

  function onGalleryDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setGalleryDragging(false)
    if (!galleryUploading && event.dataTransfer.files.length) void addImages(event.dataTransfer.files)
  }

  async function removeDocument(id: number) {
    try {
      await deleteDocument(id)
      if (selectedId === id) setSelectedId(null)
      setMessages([])
      setActiveChunks([])
      await loadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete document')
    }
  }

  async function removeImage(id: number) {
    try {
      await deleteGalleryImage(id)
      await Promise.all([loadGallery(), loadLearn()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete image')
    }
  }

  async function addLearnPoint(title: string, body: string, image: File | null) {
    setLearnSaving(true)
    setError('')
    try {
      await createLearnPoint(title, body, image)
      await Promise.all([loadLearn(), loadGallery()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save learning point')
    } finally {
      setLearnSaving(false)
    }
  }

  async function removeLearnPoint(id: number) {
    try {
      await deleteLearnPoint(id)
      await loadLearn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete learning point')
    }
  }

  async function sendQuestion(text: string) {
    if (!text || !canAsk) return
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, chunks: [] }
    setMessages((current) => [...current, userMessage])
    setQuestion('')
    setAsking(true)
    setError('')
    try {
      const payload = await askQuestion(text)
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: payload.answer,
        chunks: payload.chunks,
      }
      setMessages((current) => [...current, assistantMessage])
      setActiveChunks(payload.chunks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the API. Is the server running on port 8005?')
    } finally {
      setAsking(false)
    }
  }

  async function onAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await sendQuestion(question.trim())
  }

  function onSelectMessage(message: ChatMessage) {
    if (message.chunks.length) {
      setActiveChunks(message.chunks)
      return
    }
    const index = messages.findIndex((item) => item.id === message.id)
    const next = messages.slice(index + 1).find((item) => item.role === 'assistant' && item.chunks.length)
    if (next) setActiveChunks(next.chunks)
  }

  return (
    <>
      <Atmosphere />
      <div className={`app${tab === 'home' ? ' is-chat' : ''}${tab === 'profile' ? ' is-profile' : ''}`}>
      <header className="header">
        <span className="brand-mark" aria-hidden="true">
          R
        </span>
        <div className="brand-copy">
          <h1>RAG Learner</h1>
          <p className="lede">Ask your AWS and RAG notes</p>
        </div>
      </header>
      <main className={`screen${tab === 'home' ? ' is-chat' : ''}`}>
        <div className={tab === 'home' ? 'is-visible' : 'is-hidden'} hidden={tab !== 'home'}>
          <ChatPanel
            messages={messages}
            draft={question}
            asking={asking}
            canAsk={canAsk}
            activeChunks={activeChunks}
            error={error}
            suggestions={suggestions}
            suggesting={suggesting}
            onDraftChange={setQuestion}
            onSend={onAsk}
            profile={profile}
            onPick={(text) => void sendQuestion(text)}
            onSelect={onSelectMessage}
          />
        </div>
        {tab === 'documents' ? (
          <DocumentsPanel
            files={files}
            pending={pending}
            selected={selected}
            selectedId={selectedId}
            docChunks={docChunks}
            uploading={uploading}
            isDragging={isDragging}
            error={error}
            onDragOver={(event) => {
              event.preventDefault()
              if (!uploading) setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onInputChange={onInputChange}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
            onRemove={(id) => void removeDocument(id)}
          />
        ) : null}
        {tab === 'learn' ? (
          <LearnPanel
            points={points}
            error={error}
            saving={learnSaving}
            onCreate={addLearnPoint}
            onRemove={(id) => void removeLearnPoint(id)}
          />
        ) : null}
        {tab === 'gallery' ? (
          <GalleryPanel
            images={images}
            uploading={galleryUploading}
            isDragging={galleryDragging}
            error={error}
            onDragOver={(event) => {
              event.preventDefault()
              if (!galleryUploading) setGalleryDragging(true)
            }}
            onDragLeave={() => setGalleryDragging(false)}
            onDrop={onGalleryDrop}
            onInputChange={onGalleryInput}
            onRemove={(id) => void removeImage(id)}
          />
        ) : null}
        {tab === 'profile' ? (
          <ProfilePanel
            theme={theme}
            themeMode={themeMode}
            profile={profile}
            onThemeMode={setThemeMode}
            onSave={persistProfile}
          />
        ) : null}
      </main>
      <BottomNav current={tab} busy={busy} onChange={setTab} />
    </div>
    </>
  )
}

export default App
