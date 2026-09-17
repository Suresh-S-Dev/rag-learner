import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import Button from './Button'
import EmptyState from './EmptyState'
import Panel from './Panel'
import TextArea from './TextArea'
import { createLearnPoint, deleteLearnPoint, listLearnPoints } from '../api/client'
import { RAG_LESSONS } from '../learn/lessons'
import { toast, toastFromError } from '@/lib/toast'
import type { LearnPoint } from '../types'

type LearnItem = {
  key: string
  title: string
  body: string
  section: string
  customId?: number
}

function matches(query: string, title: string, body: string) {
  if (!query) return true
  return title.toLowerCase().includes(query) || body.toLowerCase().includes(query)
}

function builtInItems(): LearnItem[] {
  return RAG_LESSONS.map((lesson) => ({
    key: `lesson:${lesson.title}`,
    title: lesson.title,
    body: lesson.body,
    section: lesson.section,
  }))
}

function customItems(points: LearnPoint[]): LearnItem[] {
  return points.map((point) => ({
    key: `point:${point.id}`,
    title: point.title,
    body: point.body,
    section: 'Your questions',
    customId: point.id,
  }))
}

function LearnPanel() {
  const [query, setQuery] = useState('')
  const [points, setPoints] = useState<LearnPoint[]>([])
  const [active, setActive] = useState(builtInItems()[0]?.key ?? '')
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const needle = query.trim().toLowerCase()
  const items = useMemo(() => {
    const all = [...builtInItems(), ...customItems(points)]
    return all.filter((item) => matches(needle, item.title, item.body))
  }, [needle, points])
  const selected = items.find((item) => item.key === active) ?? items[0] ?? null

  useEffect(() => {
    void loadPoints()
  }, [])

  useEffect(() => {
    if (selected && selected.key !== active) setActive(selected.key)
  }, [active, selected])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving])

  async function loadPoints() {
    try {
      const payload = await listLearnPoints()
      setPoints(payload.points ?? [])
    } catch (err) {
      toastFromError(err, 'Could not load questions')
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = question.trim()
    if (!title || saving) return
    setSaving(true)
    try {
      const created = (await createLearnPoint(title, answer.trim())) as LearnPoint
      setQuestion('')
      setAnswer('')
      setOpen(false)
      await loadPoints()
      setActive(`point:${created.id}`)
      toast.success('Question added')
    } catch (err) {
      toastFromError(err, 'Could not save question')
    } finally {
      setSaving(false)
    }
  }

  async function onRemove(id: number) {
    try {
      await deleteLearnPoint(id)
      await loadPoints()
      toast.success('Question removed')
    } catch (err) {
      toastFromError(err, 'Could not delete question')
    }
  }

  return (
    <Panel title="Learn RAG" className="learn-shell">
      <div className="learn-toolbar">
        <label className="learn-search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            className="field-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search questions"
            type="search"
          />
        </label>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={16} strokeWidth={2} />
          Add question
        </Button>
      </div>
      <div className="learn-split">
        <div className="learn-questions" role="listbox" aria-label="Questions">
          {items.length === 0 ? (
            <EmptyState>No questions match that search.</EmptyState>
          ) : (
            items.map((item, index) => {
              const showSection = index === 0 || items[index - 1].section !== item.section
              return (
                <div key={item.key} className="learn-q-block">
                  {showSection ? <p className="learn-q-section">{item.section}</p> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected?.key === item.key}
                    className={`learn-q glass${selected?.key === item.key ? ' is-active' : ''}`}
                    onClick={() => setActive(item.key)}
                  >
                    <span className="learn-q-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="learn-q-title">{item.title}</span>
                  </button>
                </div>
              )
            })
          )}
        </div>
        <div className="learn-answer glass">
          {selected ? (
            <>
              <div className="learn-a-head">
                <p className="learn-a-kicker">{selected.section}</p>
                {selected.customId ? (
                  <Button variant="secondary" onClick={() => void onRemove(selected.customId as number)}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <h3 className="learn-a-title">{selected.title}</h3>
              <p className="learn-a-body">{selected.body}</p>
            </>
          ) : (
            <EmptyState>Pick a question to read the answer.</EmptyState>
          )}
        </div>
      </div>
      {open ? (
        <div
          className="doc-modal-back"
          onClick={() => {
            if (!saving) setOpen(false)
          }}
        >
          <form
            className="doc-modal glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="learn-add-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => void onSubmit(event)}
          >
            <div className="doc-modal-head">
              <h3 id="learn-add-title">Add question</h3>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Close
              </Button>
            </div>
            <label className="profile-fields">
              <span className="profile-label">Question</span>
              <input
                className="field-input glass"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What do you want to remember?"
                disabled={saving}
              />
            </label>
            <label className="profile-fields">
              <span className="profile-label">Answer</span>
              <TextArea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Write the answer"
                rows={6}
                disabled={saving}
              />
            </label>
            <Button type="submit" variant="primary" block disabled={saving || !question.trim()}>
              {saving ? 'Saving…' : 'Save question'}
            </Button>
          </form>
        </div>
      ) : null}
    </Panel>
  )
}

export default LearnPanel
