import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import EmptyState from './EmptyState'
import Panel from './Panel'
import { RAG_LESSONS } from '../learn/lessons'

function matches(query: string, title: string, body: string) {
  if (!query) return true
  return title.toLowerCase().includes(query) || body.toLowerCase().includes(query)
}

function LearnPanel() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(RAG_LESSONS[0]?.title ?? '')
  const needle = query.trim().toLowerCase()
  const lessons = useMemo(
    () => RAG_LESSONS.filter((lesson) => matches(needle, lesson.title, lesson.body)),
    [needle],
  )
  const selected = lessons.find((lesson) => lesson.title === active) ?? lessons[0] ?? null

  useEffect(() => {
    if (selected && selected.title !== active) setActive(selected.title)
  }, [active, selected])

  return (
    <Panel title="Learn RAG" className="learn-shell">
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
      <div className="learn-split">
        <div className="learn-questions" role="listbox" aria-label="Questions">
          {lessons.length === 0 ? (
            <EmptyState>No questions match that search.</EmptyState>
          ) : (
            lessons.map((lesson, index) => (
              <button
                key={lesson.title}
                type="button"
                role="option"
                aria-selected={selected?.title === lesson.title}
                className={`learn-q glass${selected?.title === lesson.title ? ' is-active' : ''}`}
                onClick={() => setActive(lesson.title)}
              >
                <span className="learn-q-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="learn-q-title">{lesson.title}</span>
              </button>
            ))
          )}
        </div>
        <div className="learn-answer glass">
          {selected ? (
            <>
              <p className="learn-a-kicker">Answer</p>
              <h3 className="learn-a-title">{selected.title}</h3>
              <p className="learn-a-body">{selected.body}</p>
            </>
          ) : (
            <EmptyState>Pick a question to read the answer.</EmptyState>
          )}
        </div>
      </div>
    </Panel>
  )
}

export default LearnPanel
