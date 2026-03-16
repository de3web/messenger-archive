import { useState, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react'
import './ChatWindow.css'
import Message from './Message'
import ChatToolbar from './ChatToolbar'
import ChatDpColumn from './ChatDpColumn'
import ChatInputSection from './ChatInputSection'
import { useConversationMessages } from '../hooks/useConversationMessages'
import { useDragWindow, WIN_W, WIN_H } from '../hooks/useDragWindow'
import { useFindInChat } from '../hooks/useFindInChat'
import type { ConversationMeta } from '../App'
import type { DisplayItem } from '../types/chat'

export type { ChatEvent } from '../types/chat'

interface Props {
  windowId: string
  conversations: ConversationMeta[]
  zIndex: number
  stackIndex: number
  onClose: () => void
  onFocus: () => void
}

function formatDate(isoStr: string): string {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}


export default function ChatWindow({ windowId, conversations, zIndex, stackIndex, onClose, onFocus }: Props) {
  const [minimized, setMinimized] = useState(false)
  const [osViewport, setOsViewport] = useState<HTMLElement | null>(null)
  const osRef = useRef<OverlayScrollbarsComponentRef>(null)

  const { messages, loading, error } = useConversationMessages(conversations)
  const { windowRef, pos, onTitleMouseDown } = useDragWindow(stackIndex, windowId, onFocus)

  // Reset window state when contact changes
  useEffect(() => {
    setMinimized(false)
  }, [windowId])

  const items = useMemo<DisplayItem[]>(() => {
    const result: DisplayItem[] = []
    let lastSessionId: number | null = null
    let lastDate = ''
    for (let i = 0; i < messages.length; i++) {
      const msg     = messages[i]
      const dateStr = formatDate(msg.dateTime)
      if (msg.sessionId !== lastSessionId) {
        result.push({ kind: 'divider', key: `divider-session-${msg.sessionId}`, label: dateStr })
        lastSessionId = msg.sessionId
        lastDate      = dateStr
      } else if (dateStr !== lastDate) {
        result.push({ kind: 'divider', key: `divider-date-${msg.sessionId}-${dateStr}`, label: dateStr })
        lastDate = dateStr
      }
      result.push({ kind: 'message', key: `msg-${msg.sessionId}-${i}`, event: msg })
    }
    return result
  }, [messages])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => osViewport,
    estimateSize: () => 44,
    overscan: 8,
    paddingStart: 8,
    paddingEnd: 8,
    getItemKey: (index) => items[index]?.key ?? index,
  })

  const {
    showFind, setShowFind,
    findInput, setFindInput,
    findInputRef, lowerFind,
    matchIndices, matchIndexSet, findIdx,
    navigate,
  } = useFindInChat(items, (index, opts) => virtualizer.scrollToIndex(index, opts as Parameters<typeof virtualizer.scrollToIndex>[1]))

  // Scroll to bottom on initial load
  const didScrollRef = useRef(false)
  useEffect(() => { if (messages.length) didScrollRef.current = false }, [windowId])
  useEffect(() => {
    if (items.length && !didScrollRef.current) {
      didScrollRef.current = true
      virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior: 'auto' })
    }
  }, [items.length])

  const contactName = conversations.map(c => c.displayName).find(n => n && n !== windowId) ?? windowId

  return (
    <>
      {minimized && (
        <div className="msn-taskbar-item" onClick={() => { setMinimized(false); onFocus() }}>
          <span className="msn-taskbar-icon">💬</span>
          <span className="msn-taskbar-title">{contactName} – Conversation</span>
          <button
            className="msn-taskbar-close"
            title="Close"
            onClick={e => { e.stopPropagation(); onClose() }}
          >&#x2715;</button>
        </div>
      )}

      <div
        ref={windowRef}
        className="msn-window"
        style={{ display: minimized ? 'none' : 'flex', left: pos.x, top: pos.y, zIndex }}
        onMouseDown={onFocus}
      >
        <div className="msn-titlebar" onMouseDown={onTitleMouseDown}>
          <div className="msn-titlebar-left">
            <span className="msn-titlebar-appicon">💬</span>
            <span className="msn-titlebar-title">{contactName} – Conversation</span>
          </div>
          <div className="msn-titlebar-controls">
            <button className="msn-ctrl msn-ctrl-min" title="Minimize" aria-label="Minimize" onClick={() => setMinimized(true)}>&#x2013;</button>
            <button className="msn-ctrl msn-ctrl-max" title="Maximize" aria-label="Maximize">&#x25A1;</button>
            <button className="msn-ctrl msn-ctrl-close" title="Close" aria-label="Close" onClick={onClose}>&#x2715;</button>
          </div>
        </div>

        <div className="msn-menubar">
          {['File', 'Edit', 'Actions', 'Tools', 'Help'].map(m => (
            <span key={m} className="msn-menu-item">{m}</span>
          ))}
        </div>

        <ChatToolbar />

        <div className="msn-body">
          <div className="msn-left">
            <div className="msn-main">
              <div className="msn-to-field">
                <span className="msn-to-label">To:</span>
                <span className="msn-to-value">
                  {contactName} <span className="msn-to-label">&lt;{windowId}&gt;</span>
                </span>
              </div>

              {showFind && (
                <div className="msn-find-bar">
                  <span className="msn-find-label">🔍</span>
                  <input
                    ref={findInputRef}
                    className="msn-find-input"
                    type="text"
                    placeholder="Find in conversation (min. 2 chars)..."
                    value={findInput}
                    onChange={e => setFindInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') navigate(e.shiftKey ? -1 : 1)
                      if (e.key === 'Escape') setShowFind(false)
                    }}
                  />
                  {lowerFind && (
                    <span className="msn-find-count">
                      {matchIndices.length === 0 ? 'No results' : `${findIdx + 1} of ${matchIndices.length}`}
                    </span>
                  )}
                  <button className="msn-find-nav" onClick={() => navigate(-1)} disabled={matchIndices.length === 0} title="Previous" aria-label="Previous match">▲</button>
                  <button className="msn-find-nav" onClick={() => navigate(1)}  disabled={matchIndices.length === 0} title="Next" aria-label="Next match">▼</button>
                  <button className="msn-find-close" onClick={() => setShowFind(false)} title="Close find bar" aria-label="Close find bar">&#x2715;</button>
                </div>
              )}

              <OverlayScrollbarsComponent
                ref={osRef}
                className="msn-messages"
                options={{ scrollbars: { autoHide: 'never', theme: 'os-theme-xp' } }}
                events={{ initialized: (instance) => setOsViewport(instance.elements().viewport) }}
              >
                {loading && <div className="msn-status-msg">Loading...</div>}
                {error   && <div className="msn-status-msg msn-status-error">Error: {error}</div>}
                {!loading && !error && messages.length === 0 && (
                  <div className="msn-status-msg">No messages found.</div>
                )}
                {!loading && !error && items.length > 0 && (
                  <div className="msn-virtual-list" style={{ height: `${virtualizer.getTotalSize()}px` }}>
                    {virtualizer.getVirtualItems().map(vItem => {
                      const item     = items[vItem.index]
                      const isMatch  = matchIndexSet.has(vItem.index)
                      const isActive = isMatch && matchIndices[findIdx] === vItem.index
                      return (
                        <div
                          key={vItem.key}
                          className="msn-virtual-item"
                          data-index={vItem.index}
                          ref={virtualizer.measureElement}
                          style={{ transform: `translateY(${vItem.start}px)` }}
                        >
                          {item.kind === 'divider' ? (
                            <div className="date-divider">
                              <span className="date-divider-line" />
                              <span className="date-divider-label">{item.label}</span>
                              <span className="date-divider-line" />
                            </div>
                          ) : (
                            <Message
                              event={item.event}
                              highlightTerm={isMatch ? lowerFind : ''}
                              isActiveMatch={isActive}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </OverlayScrollbarsComponent>
            </div>

            <ChatInputSection
              showFind={showFind}
              onToggleFind={() => setShowFind(v => !v)}
            />
          </div>

          <ChatDpColumn />
        </div>

        <div className="msn-statusbar">
          Click for new Emoticons and Theme Packs from Blue Mountain
        </div>
      </div>
    </>
  )
}
