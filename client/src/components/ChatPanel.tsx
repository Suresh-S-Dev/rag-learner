import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, SquarePen } from 'lucide-react'
import Avatar from './Avatar'
import Button from './Button'
import EmptyState from './EmptyState'
import FormattedText from './FormattedText'
import TextArea from './TextArea'
import type { ChatMessage, ChatTurn, Profile, RetrievedChunk } from '../types'

type SideTab = 'chunks' | 'history'

type Props = {
  messages: ChatMessage[]
  draft: string
  asking: boolean
  canAsk: boolean
  activeChunks: RetrievedChunk[]
  history: ChatTurn[]
  activeTurnId: number | null
  suggestions: string[]
  suggesting: boolean
  profile: Profile
  onDraftChange: (value: string) => void
  onSend: (event: FormEvent<HTMLFormElement>) => void
  onPick: (text: string) => void
  onSelect: (message: ChatMessage) => void
  onSelectHistory: (turn: ChatTurn) => void
  onRemoveHistory: (id: number) => void
  onNewChat: () => void
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function ChatPanel({
  messages,
  draft,
  asking,
  canAsk,
  activeChunks,
  history,
  activeTurnId,
  suggestions,
  suggesting,
  profile,
  onDraftChange,
  onSend,
  onPick,
  onSelect,
  onSelectHistory,
  onRemoveHistory,
  onNewChat,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<SideTab>('chunks')

  useEffect(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, asking])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="chat-shell">
      <section className="chat-main glass">
        <div className="chat-toolbar">
          <h2 className="panel-title">Chat</h2>
          <Button variant="secondary" onClick={onNewChat} disabled={asking || messages.length === 0}>
            <SquarePen size={16} strokeWidth={2} />
            New chat
          </Button>
        </div>
        <div className="chat-thread" ref={scroller}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <EmptyState>
                {canAsk || asking
                  ? 'Try one of these questions from your notes, or write your own.'
                  : 'Upload notes on the Documents tab, then come back here to chat.'}
              </EmptyState>
              {suggesting ? <p className="empty">Writing three suggestions from your documents…</p> : null}
              {suggestions.length > 0 ? (
                <ul className="suggest-list">
                  {suggestions.slice(0, 3).map((item) => (
                    <li key={item}>
                      <button type="button" className="suggest-chip glass" onClick={() => onPick(item)} disabled={!canAsk}>
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <ul className="chat-list">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className={`chat-bubble is-${message.role}${message.chunks.length ? ' has-chunks' : ''}`}
                    onClick={() => {
                      onSelect(message)
                      setSide('chunks')
                    }}
                  >
                    <div className="chat-head">
                      <Avatar
                        name={message.role === 'user' ? profile.userName : profile.assistantName}
                        src={message.role === 'user' ? profile.userAvatar : profile.assistantAvatar}
                      />
                      <span className="chat-role">
                        {message.role === 'user' ? profile.userName : profile.assistantName}
                      </span>
                    </div>
                    <FormattedText text={message.text} />
                  </button>
                </li>
              ))}
              {asking ? (
                <li>
                  <div className="chat-bubble is-assistant">
                    <div className="chat-head">
                      <Avatar name={profile.assistantName} src={profile.assistantAvatar} />
                      <span className="chat-role">{profile.assistantName}</span>
                    </div>
                    <p className="empty">Retrieving and generating…</p>
                  </div>
                </li>
              ) : null}
            </ul>
          )}
        </div>
        <form className="chat-composer" onSubmit={onSend}>
          <TextArea
            className="chat-input"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your notes"
            rows={1}
            disabled={!canAsk}
          />
          <Button type="submit" variant="primary" disabled={!canAsk || !draft.trim()} aria-label="Send">
            <ArrowUp size={18} strokeWidth={2} />
          </Button>
        </form>
      </section>
      <aside className="chat-sidebar glass">
        <div className="sidebar-tabs" role="tablist" aria-label="Sidebar">
          <button
            type="button"
            role="tab"
            aria-selected={side === 'chunks'}
            className={`sidebar-tab${side === 'chunks' ? ' is-active' : ''}`}
            onClick={() => setSide('chunks')}
          >
            Retrieved chunks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={side === 'history'}
            className={`sidebar-tab${side === 'history' ? ' is-active' : ''}`}
            onClick={() => setSide('history')}
          >
            History
          </button>
        </div>
        {side === 'chunks' ? (
          activeChunks.length === 0 ? (
            <EmptyState>Retrieved chunks from the selected answer will appear here.</EmptyState>
          ) : (
            <ul className="chunk-list">
              {activeChunks.map((chunk, index) => (
                <li key={`${chunk.source}-${index}`}>
                  <div className="doc-view-head">
                    <span className="file-name">{chunk.source}</span>
                    <span className="file-size">{chunk.score.toFixed(2)}</span>
                  </div>
                  <pre className="doc-text glass">{chunk.text}</pre>
                </li>
              ))}
            </ul>
          )
        ) : history.length === 0 ? (
          <EmptyState>Questions you ask are saved here.</EmptyState>
        ) : (
          <ul className="history-list">
            {[...history].reverse().map((turn) => (
              <li key={turn.id}>
                <div className={`history-item${activeTurnId === turn.id ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className="history-open"
                    onClick={() => {
                      onSelectHistory(turn)
                      setSide('chunks')
                    }}
                  >
                    <span className="file-name">{turn.question}</span>
                    <span className="file-size">{formatWhen(turn.createdAt)}</span>
                  </button>
                  <Button variant="ghost" onClick={() => onRemoveHistory(turn.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

export default ChatPanel
