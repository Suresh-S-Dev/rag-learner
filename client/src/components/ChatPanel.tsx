import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import Avatar from './Avatar'
import Button from './Button'
import EmptyState from './EmptyState'
import FormattedText from './FormattedText'
import TextArea from './TextArea'
import type { ChatMessage, Profile, RetrievedChunk } from '../types'

type Props = {
  messages: ChatMessage[]
  draft: string
  asking: boolean
  canAsk: boolean
  activeChunks: RetrievedChunk[]
  error: string
  suggestions: string[]
  suggesting: boolean
  profile: Profile
  onDraftChange: (value: string) => void
  onSend: (event: FormEvent<HTMLFormElement>) => void
  onPick: (text: string) => void
  onSelect: (message: ChatMessage) => void
}

function ChatPanel({
  messages,
  draft,
  asking,
  canAsk,
  activeChunks,
  error,
  suggestions,
  suggesting,
  profile,
  onDraftChange,
  onSend,
  onPick,
  onSelect,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null)

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
                    onClick={() => onSelect(message)}
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
          {error ? <p className="error">{error}</p> : null}
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
        <h2 className="panel-title">Retrieved chunks</h2>
        {activeChunks.length === 0 ? (
          <EmptyState>Chunks used for the selected answer will appear here.</EmptyState>
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
        )}
      </aside>
    </div>
  )
}

export default ChatPanel
