import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import {
  askQuestion,
  deleteChatTurn,
  deleteDocument,
  deleteGalleryImage,
  getDocument,
  getDocumentChunks,
  ingestFiles,
  listChat,
  listDocuments,
  listGallery,
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
import { Toaster } from '@/components/ui/sonner'
import { toast, toastFromError } from '@/lib/toast'
import { loadProfile, saveProfile } from './profile'
import { applyTheme, getInitialThemeMode, getSystemTheme, persistThemeMode, resolveTheme } from './theme'
import type {
  ChatMessage,
  ChatTurn,
  DocChunk,
  DocumentDetail,
  DocumentItem,
  GalleryImage,
  PendingUpload,
  Profile,
  RetrievedChunk,
  TabId,
  ThemeMode,
} from './types'
import './App.css'

const QUESTION_KEY = 'rag-learner-question'
const CHAT_SESSION_KEY = 'rag-learner-chat-session'
const TABS: TabId[] = ['home', 'documents', 'learn', 'gallery', 'profile']

function loadQuestion(): string {
  return localStorage.getItem(QUESTION_KEY) ?? ''
}

function tabFromHash(): TabId {
  const id = window.location.hash.replace(/^#/, '')
  return TABS.includes(id as TabId) ? (id as TabId) : 'home'
}

function writeTabHash(tab: TabId) {
  const next = `#${tab}`
  if (window.location.hash !== next) window.location.hash = tab
}

function messagesFromTurns(turns: ChatTurn[]): ChatMessage[] {
  return turns.flatMap((turn) => [
    { id: `q-${turn.id}`, role: 'user' as const, text: turn.question, chunks: [] },
    { id: `a-${turn.id}`, role: 'assistant' as const, text: turn.answer, chunks: turn.chunks },
  ])
}

function sessionStartId() {
  const value = Number(localStorage.getItem(CHAT_SESSION_KEY) ?? '0')
  return Number.isFinite(value) ? value : 0
}

function visibleTurns(turns: ChatTurn[]) {
  const start = sessionStartId()
  return turns.filter((turn) => turn.id > start)
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)
  const theme = resolveTheme(themeMode)
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const persistProfile = useCallback((next: Profile) => {
    setProfile(next)
    saveProfile(next)
  }, [])
  const [tab, setTab] = useState<TabId>(tabFromHash)
  const [files, setFiles] = useState<DocumentItem[]>([])
  const [pending, setPending] = useState<PendingUpload[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryPending, setGalleryPending] = useState<File[]>([])
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState(loadQuestion)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeChunks, setActiveChunks] = useState<RetrievedChunk[]>([])
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [activeTurnId, setActiveTurnId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const toastedErrors = useRef(new Set<number>())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selected, setSelected] = useState<DocumentDetail | null>(null)
  const [docChunks, setDocChunks] = useState<DocChunk[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
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
    writeTabHash(tab)
  }, [tab])

  useEffect(() => {
    function onHash() {
      setTab(tabFromHash())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (files.length === 0 && pending.length === 0 && !uploading) {
      setSuggestions([])
    }
  }, [files.length, pending.length, uploading])

  async function loadDocuments(quiet = false) {
    try {
      const payload = await listDocuments()
      setFiles(payload.files)
    } catch (err) {
      if (!quiet) toastFromError(err, 'Could not load documents')
    }
  }

  async function loadChat() {
    try {
      const payload = await listChat()
      const turns = (payload.turns ?? []) as ChatTurn[]
      setHistory(turns)
      const shown = visibleTurns(turns)
      setMessages(messagesFromTurns(shown))
      const last = shown[shown.length - 1]
      if (last) {
        setActiveChunks(last.chunks)
        setActiveTurnId(last.id)
      } else {
        setActiveChunks([])
        setActiveTurnId(null)
      }
    } catch (err) {
      toastFromError(err, 'Could not load chat history')
    }
  }

  async function loadGallery() {
    try {
      const payload = await listGallery()
      setImages(payload.images)
    } catch (err) {
      toastFromError(err, 'Could not load gallery')
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
    void loadChat()
  }, [])

  useEffect(() => {
    for (const file of files) {
      if (file.status === 'error' && file.error && !toastedErrors.current.has(file.id)) {
        toastedErrors.current.add(file.id)
        toast.error(`${file.name}: ${file.error}`)
      }
      if (file.status !== 'error') toastedErrors.current.delete(file.id)
    }
  }, [files])

  useEffect(() => {
    if (!busy) return
    const timer = window.setInterval(() => {
      void loadDocuments(true)
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
          toastFromError(err, 'Could not load document')
        }
    })()
  }, [selectedId, selectedMeta?.status, selectedMeta?.chunks, selectedMeta?.detail])

  async function addFiles(incoming: FileList | File[]) {
    const incomingFiles = Array.from(incoming)
    if (!incomingFiles.length) return
    setUploading(true)
    setPending(incomingFiles.map((file) => ({ name: file.name })))
    try {
      await ingestFiles(incomingFiles)
      await loadDocuments()
      toast.success(
        incomingFiles.length === 1 ? 'Document uploaded' : `${incomingFiles.length} documents uploaded`,
      )
    } catch (err) {
      toastFromError(err, 'Could not reach the API. Is the server running on port 8005?')
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
    setGalleryPending(incomingFiles)
    try {
      await uploadGallery(incomingFiles)
      await loadGallery()
      toast.success(incomingFiles.length === 1 ? 'Image uploaded' : `${incomingFiles.length} images uploaded`)
    } catch (err) {
      toastFromError(err, 'Could not upload images')
    } finally {
      setGalleryPending([])
      setGalleryUploading(false)
    }
  }

  function onGalleryInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addImages(event.target.files)
    event.target.value = ''
  }

  async function removeDocument(id: number) {
    try {
      await deleteDocument(id)
      if (selectedId === id) setSelectedId(null)
      await loadDocuments()
      toast.success('Document removed')
    } catch (err) {
      toastFromError(err, 'Could not delete document')
    }
  }

  async function removeImage(id: number) {
    try {
      await deleteGalleryImage(id)
      await loadGallery()
      toast.success('Image removed')
    } catch (err) {
      toastFromError(err, 'Could not delete image')
    }
  }

  async function sendQuestion(text: string) {
    if (!text || !canAsk) return
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text, chunks: [] }
    setMessages((current) => [...current, userMessage])
    setQuestion('')
    setAsking(true)
    try {
      const payload = await askQuestion(text)
      const turn: ChatTurn = {
        id: payload.id,
        createdAt: payload.createdAt,
        question: payload.question ?? text,
        answer: payload.answer,
        chunks: payload.chunks,
      }
      setHistory((current) => [...current, turn])
      setMessages((current) => [
        ...current.slice(0, -1),
        { id: `q-${turn.id}`, role: 'user', text: turn.question, chunks: [] },
        { id: `a-${turn.id}`, role: 'assistant', text: turn.answer, chunks: turn.chunks },
      ])
      setActiveChunks(turn.chunks)
      setActiveTurnId(turn.id)
    } catch (err) {
      setMessages((current) => current.slice(0, -1))
      toastFromError(err, 'Could not reach the API. Is the server running on port 8005?')
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
      const match = /^a-(\d+)$/.exec(message.id)
      if (match) setActiveTurnId(Number(match[1]))
      return
    }
    const index = messages.findIndex((item) => item.id === message.id)
    const next = messages.slice(index + 1).find((item) => item.role === 'assistant' && item.chunks.length)
    if (next) {
      setActiveChunks(next.chunks)
      const match = /^a-(\d+)$/.exec(next.id)
      if (match) setActiveTurnId(Number(match[1]))
    }
  }

  function onSelectHistory(turn: ChatTurn) {
    setActiveChunks(turn.chunks)
    setActiveTurnId(turn.id)
    setMessages(messagesFromTurns([turn]))
  }

  function startNewChat() {
    if (asking) return
    const lastId = history[history.length - 1]?.id ?? 0
    localStorage.setItem(CHAT_SESSION_KEY, String(lastId))
    setMessages([])
    setActiveChunks([])
    setActiveTurnId(null)
  }

  async function removeHistory(id: number) {
    try {
      await deleteChatTurn(id)
      const next = history.filter((turn) => turn.id !== id)
      setHistory(next)
      const shown = visibleTurns(next)
      setMessages(messagesFromTurns(shown))
      if (activeTurnId === id) {
        const last = shown[shown.length - 1]
        setActiveTurnId(last ? last.id : null)
        setActiveChunks(last ? last.chunks : [])
      }
      toast.success('Removed from history')
    } catch (err) {
      toastFromError(err, 'Could not delete chat history')
    }
  }

  return (
    <>
      <Atmosphere />
      <Toaster />
      <div className={`app${tab === 'home' ? ' is-chat' : ''}${tab === 'documents' ? ' is-docs' : ''}${tab === 'learn' ? ' is-learn' : ''}${tab === 'profile' ? ' is-profile' : ''}`}>
      <header className="header">
        <span className="brand-mark" aria-hidden="true">
          R
        </span>
        <div className="brand-copy">
          <h1>RAG Learner</h1>
          <p className="lede">Ask your AWS and RAG notes</p>
        </div>
      </header>
      <main className={`screen${tab === 'home' || tab === 'documents' || tab === 'learn' ? ' is-chat' : ''}`}>
        <div className={tab === 'home' ? 'is-visible' : 'is-hidden'} hidden={tab !== 'home'}>
          <ChatPanel
            messages={messages}
            draft={question}
            asking={asking}
            canAsk={canAsk}
            activeChunks={activeChunks}
            history={history}
            activeTurnId={activeTurnId}
            suggestions={suggestions}
            suggesting={suggesting}
            onDraftChange={setQuestion}
            onSend={onAsk}
            profile={profile}
            onPick={(text) => void sendQuestion(text)}
            onSelect={onSelectMessage}
            onSelectHistory={onSelectHistory}
            onRemoveHistory={(id) => void removeHistory(id)}
            onNewChat={startNewChat}
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
        {tab === 'learn' ? <LearnPanel /> : null}
        {tab === 'gallery' ? (
          <GalleryPanel
            images={images}
            pending={galleryPending}
            uploading={galleryUploading}
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
