import { useState, type ChangeEvent, type DragEvent } from 'react'
import './App.css'

const ACCEPTED_TYPES = '.pdf,.txt,.md,.docx'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  function addFiles(incoming: FileList | File[]) {
    const next = Array.from(incoming)
    setFiles((current) => {
      const names = new Set(current.map((file) => `${file.name}-${file.size}`))
      return [...current, ...next.filter((file) => !names.has(`${file.name}-${file.size}`))]
    })
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files)
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  return (
    <main className="page">
      <h1>Upload documents</h1>
      <p className="lede">Add study notes to use later for retrieval.</p>

      <label
        className={`dropzone${isDragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={onInputChange}
        />
        <span>Drop files here, or click to browse</span>
        <span className="hint">PDF, TXT, MD, or DOCX</span>
      </label>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() =>
                  setFiles((current) => current.filter((item) => item !== file))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
