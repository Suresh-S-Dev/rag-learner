import { useState, type FormEvent } from 'react'
import Button from './Button'
import EmptyState from './EmptyState'
import Panel from './Panel'
import TextArea from './TextArea'
import { mediaUrl } from '../api/client'
import { RAG_LESSONS } from '../learn/lessons'
import type { LearnPoint } from '../types'

type Props = {
  points: LearnPoint[]
  error: string
  saving: boolean
  onCreate: (title: string, body: string, image: File | null) => Promise<void>
  onRemove: (id: number) => void
}

function LearnPanel({ points, error, saving, onCreate, onRemove }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState<File | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || saving) return
    await onCreate(title.trim(), body.trim(), image)
    setTitle('')
    setBody('')
    setImage(null)
  }

  return (
    <Panel title="Learn RAG">
      <p className="hint">Study the stages this project builds by hand, then add your own notes and diagrams.</p>
      {error ? <p className="error">{error}</p> : null}

      <form className="ask-form" onSubmit={onSubmit}>
        <input
          className="field-input glass"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A point you want to remember"
          disabled={saving}
        />
        <TextArea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Explain it in your own words"
          rows={4}
          disabled={saving}
        />
        <label className="file-pick glass hint">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.gif"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            disabled={saving}
          />
          {image ? image.name : 'Attach an image for the gallery'}
        </label>
        <Button type="submit" variant="primary" block disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Add learning point'}
        </Button>
      </form>

      <h3>RAG stages</h3>
      <ul className="lesson-list">
        {RAG_LESSONS.map((lesson) => (
          <li key={lesson.title} className="glass lesson-card">
            <p className="file-name">{lesson.title}</p>
            <p className="hint">{lesson.body}</p>
          </li>
        ))}
      </ul>

      <h3>Your points</h3>
      {points.length === 0 ? (
        <EmptyState>Add a point above. Images you attach also show up in Gallery.</EmptyState>
      ) : (
        <ul className="lesson-list">
          {points.map((point) => (
            <li key={point.id} className="glass lesson-card">
              <div className="doc-view-head">
                <p className="file-name">{point.title}</p>
                <Button variant="secondary" onClick={() => onRemove(point.id)}>
                  Remove
                </Button>
              </div>
              {point.body ? <p className="hint">{point.body}</p> : null}
              {point.image ? (
                <img className="lesson-image" src={mediaUrl(point.image.url)} alt={point.image.name} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default LearnPanel
