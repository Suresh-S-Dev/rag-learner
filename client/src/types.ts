export type Theme = 'light' | 'dark'
export type ThemeMode = 'light' | 'dark' | 'system'

export type Profile = {
  userName: string
  assistantName: string
  userAvatar: string
  assistantAvatar: string
}
export type TabId = 'home' | 'documents' | 'learn' | 'gallery' | 'profile'
export type FileStatus = 'queued' | 'chunking' | 'embedding' | 'ready' | 'error'

export type DocumentItem = {
  id: number
  name: string
  status: FileStatus
  chunks: number
  error: string | null
  detail: string | null
  createdAt: string | null
}

export type PendingUpload = {
  name: string
}

export type DocumentDetail = DocumentItem & {
  text: string
}

export type DocChunk = {
  id: number
  position: number
  text: string
}

export type RetrievedChunk = {
  source: string
  score: number
  text: string
}

export type ChatTurn = {
  id: number
  createdAt: string
  question: string
  answer: string
  chunks: RetrievedChunk[]
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  chunks: RetrievedChunk[]
}

export type GalleryImage = {
  id: number
  name: string
  url: string
}

export type LearnPoint = {
  id: number
  title: string
  body: string
  image: GalleryImage | null
}

export type Lesson = {
  title: string
  body: string
}
