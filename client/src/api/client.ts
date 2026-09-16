const API = 'http://127.0.0.1:8005'

export async function readError(response: Response) {
  try {
    const payload = await response.json()
    if (typeof payload.detail === 'string') return payload.detail
    return JSON.stringify(payload.detail)
  } catch {
    return response.statusText
  }
}

export async function listDocuments() {
  const response = await fetch(`${API}/documents`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function getDocument(id: number) {
  const response = await fetch(`${API}/documents/${id}`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function getDocumentChunks(id: number) {
  const response = await fetch(`${API}/documents/${id}/chunks`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function ingestFiles(files: File[]) {
  const body = new FormData()
  files.forEach((file) => body.append('files', file))
  const response = await fetch(`${API}/ingest`, { method: 'POST', body })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function deleteDocument(id: number) {
  const response = await fetch(`${API}/documents/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function suggestQuestions() {
  const response = await fetch(`${API}/suggest`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function askQuestion(question: string) {
  const response = await fetch(`${API}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export function mediaUrl(path: string) {
  if (path.startsWith('http')) return path
  return `${API}${path}`
}

export async function listGallery() {
  const response = await fetch(`${API}/gallery`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function uploadGallery(files: File[]) {
  const body = new FormData()
  files.forEach((file) => body.append('files', file))
  const response = await fetch(`${API}/gallery`, { method: 'POST', body })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function deleteGalleryImage(id: number) {
  const response = await fetch(`${API}/gallery/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function listLearnPoints() {
  const response = await fetch(`${API}/learn`)
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function createLearnPoint(title: string, body: string, image?: File | null) {
  const payload = new FormData()
  payload.append('title', title)
  payload.append('body', body)
  if (image) payload.append('image', image)
  const response = await fetch(`${API}/learn`, { method: 'POST', body: payload })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}

export async function deleteLearnPoint(id: number) {
  const response = await fetch(`${API}/learn/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(await readError(response))
  return response.json()
}
