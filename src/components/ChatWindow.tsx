import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-react'
import './ChatWindow.css'
import Message from './Message'
import type { ConversationMeta } from '../App'

export interface ChatEvent {
  type: 'message' | 'invitation' | 'invitationResponse'
  dateTime: string
  sessionId: number
  fromName: string
  toName: string
  text: string
  style: string
  isYou: boolean
  file?: string
}

interface ConversationDetail {
  meta: ConversationMeta
  messages: ChatEvent[]
}

interface Props {
  windowId: string
  conversations: ConversationMeta[]
  zIndex: number
  stackIndex: number
  onClose: () => void
  onFocus: () => void
}

const WIN_W = 680
const WIN_H = 530
const CASCADE = 28   // px offset per stacked window

function formatDate(isoStr: string): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(isoStr: string): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const TOOLBAR_BTNS = [
  { icon: '👥', label: 'Invite' },
  { icon: '📁', label: 'Send Files' },
  { icon: '📹', label: 'Video' },
  { icon: '🎤', label: 'Voice' },
  { icon: '🎯', label: 'Activities' },
  { icon: '🎮', label: 'Games' },
]

type DisplayItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; event: ChatEvent; timeStr: string }

export default function ChatWindow({ windowId, conversations, zIndex, stackIndex, onClose, onFocus }: Props) {
  const [messages, setMessages]   = useState<ChatEvent[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [pos, setPos]             = useState({ x: 0, y: 0 })

  const [showFind, setShowFind]   = useState(false)
  const [findInput, setFindInput] = useState('')
  const [findTerm, setFindTerm]   = useState('')
  const [findIdx, setFindIdx]     = useState(0)

  const windowRef    = useRef<HTMLDivElement>(null)
  const osRef        = useRef<OverlayScrollbarsComponentRef>(null)
  const findInputRef = useRef<HTMLInputElement>(null)
  const drag         = useRef({ active: false, ox: 0, oy: 0, x: 0, y: 0 })
  const [osViewport, setOsViewport] = useState<HTMLElement | null>(null)

  // ── Center + reset when this window is first created ─────────────────
  useEffect(() => {
    const offset = stackIndex * CASCADE
    const x = Math.round(Math.max(0, (window.innerWidth  - WIN_W) / 2)) + offset
    const y = Math.round(Math.max(0, (window.innerHeight - WIN_H) / 2)) + offset
    setPos({ x, y })
    setMinimized(false)
    setShowFind(false)
    setFindInput('')
    setFindTerm('')
    setFindIdx(0)
  }, [windowId])

  useEffect(() => {
    const el = windowRef.current
    if (el) { el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px` }
  }, [pos])

  // ── Drag ──────────────────────────────────────────────────────────────
  const onTitleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y, x: pos.x, y: pos.y }
    e.preventDefault()
    onFocus()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active || !windowRef.current) return
      const x = Math.max(-WIN_W + 120, Math.min(window.innerWidth  - 120, e.clientX - drag.current.ox))
      const y = Math.max(0,            Math.min(window.innerHeight -  40, e.clientY - drag.current.oy))
      drag.current.x = x; drag.current.y = y
      windowRef.current.style.left = `${x}px`
      windowRef.current.style.top  = `${y}px`
    }
    const onUp = () => {
      if (!drag.current.active) return
      drag.current.active = false
      setPos({ x: drag.current.x, y: drag.current.y })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── Fetch + merge all conversations ───────────────────────────────────
  const conversationKey = conversations.map(c => c.id).join(',')
  useEffect(() => {
    if (!conversations.length) return
    setLoading(true)
    setError(null)

    Promise.all(
      conversations.map((c, fileIdx) =>
        fetch(`/api/conversations/${c.account}/${c.filename}`)
          .then(r => r.json())
          .then((data: ConversationDetail) =>
            // Offset sessionIds by file index so they don't collide when merged
            data.messages.map(msg => ({
              ...msg,
              sessionId: msg.sessionId + fileIdx * 1_000_000,
            }))
          )
      )
    )
      .then(results => {
        const all = results.flat()
        all.sort((a, b) => a.dateTime.localeCompare(b.dateTime))
        setMessages(all)
        setLoading(false)
      })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [conversationKey])

  // ── Scroll to bottom on load ──────────────────────────────────────────
  const didScrollRef = useRef(false)
  useEffect(() => { if (messages.length) didScrollRef.current = false }, [conversationKey])

  // ── Find bar debounce ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setFindTerm(findInput), 300)
    return () => clearTimeout(id)
  }, [findInput])

  useEffect(() => {
    if (showFind) findInputRef.current?.focus()
    else { setFindInput(''); setFindTerm(''); setFindIdx(0) }
  }, [showFind])

  useEffect(() => { setFindIdx(0) }, [findTerm])

  // ── Build display items ───────────────────────────────────────────────
  const items = useMemo<DisplayItem[]>(() => {
    const result: DisplayItem[] = []
    let lastSessionId: number | null = null
    let lastDate = ''
    for (let i = 0; i < messages.length; i++) {
      const msg     = messages[i]
      const dateStr = formatDate(msg.dateTime)
      if (msg.sessionId !== lastSessionId) {
        result.push({ kind: 'divider', key: `divider-${i}-${msg.sessionId}`, label: dateStr })
        lastSessionId = msg.sessionId
        lastDate      = dateStr
      } else if (dateStr !== lastDate) {
        result.push({ kind: 'divider', key: `divider-date-${i}`, label: dateStr })
        lastDate = dateStr
      }
      result.push({ kind: 'message', key: `msg-${i}`, event: msg, timeStr: formatTime(msg.dateTime) })
    }
    return result
  }, [messages])

  // ── Virtualizer ───────────────────────────────────────────────────────
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => osViewport,
    estimateSize: () => 44,
    overscan: 8,
    paddingStart: 8,
    paddingEnd: 8,
  })

  useEffect(() => {
    if (items.length && !didScrollRef.current) {
      didScrollRef.current = true
      virtualizer.scrollToIndex(items.length - 1, { align: 'end', behavior: 'auto' })
    }
  }, [items.length])

  // ── Search ────────────────────────────────────────────────────────────
  const lowerFind = findTerm.trim().length >= 2 ? findTerm.trim().toLowerCase() : ''

  const matchIndices = useMemo(() => {
    if (!lowerFind) return []
    const result: number[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'message' && String(item.event.text).toLowerCase().includes(lowerFind)) {
        result.push(i)
      }
    }
    return result
  }, [items, lowerFind])

  const matchIndexSet = useMemo(() => new Set(matchIndices), [matchIndices])

  useEffect(() => {
    if (!matchIndices.length) return
    virtualizer.scrollToIndex(matchIndices[findIdx], { align: 'center', behavior: 'smooth' })
  }, [findIdx, matchIndices])

  const navigate = useCallback((dir: 1 | -1) => {
    if (!matchIndices.length) return
    setFindIdx(i => (i + dir + matchIndices.length) % matchIndices.length)
  }, [matchIndices])

  const contactName = conversations.map(c => c.displayName).find(n => n && n !== windowId) ?? windowId

  return (
    <>
      {/* Minimized taskbar button */}
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

      {/* Floating window */}
      <div
        ref={windowRef}
        className="msn-window"
        style={{ display: minimized ? 'none' : 'flex', left: pos.x, top: pos.y, zIndex }}
        onMouseDown={onFocus}
      >
        {/* Title bar */}
        <div className="msn-titlebar" onMouseDown={onTitleMouseDown}>
          <div className="msn-titlebar-left">
            <span className="msn-titlebar-appicon">💬</span>
            <span className="msn-titlebar-title">{contactName} – Conversation</span>
          </div>
          <div className="msn-titlebar-controls">
            <button className="msn-ctrl msn-ctrl-min" title="Minimize" onClick={() => setMinimized(true)}>&#x2013;</button>
            <button className="msn-ctrl msn-ctrl-max" title="Maximize">&#x25A1;</button>
            <button className="msn-ctrl msn-ctrl-close" title="Close" onClick={onClose}>&#x2715;</button>
          </div>
        </div>

        {/* Menu bar */}
        <div className="msn-menubar">
          {['File', 'Edit', 'Actions', 'Tools', 'Help'].map(m => (
            <span key={m} className="msn-menu-item">{m}</span>
          ))}
        </div>

        {/* Toolbar */}
        <div className="msn-toolbar">
          <div className="msn-toolbar-buttons">
            {TOOLBAR_BTNS.map(btn => (
              <button key={btn.label} className="msn-toolbar-btn">
                <span className="msn-toolbar-btn-icon">{btn.icon}</span>
                <span className="msn-toolbar-btn-label">{btn.label}</span>
              </button>
            ))}
          </div>
          <div className="msn-toolbar-brand">
            <span className="msn-brand-butterfly">🦋</span>
            <span className="msn-brand-text">msn</span>
            <div className="msn-brand-actions">
              <button className="msn-brand-btn" title="Block">🚫</button>
              <button className="msn-brand-btn" title="Settings">&#x2699;</button>
            </div>
          </div>
        </div>

        {/* Body: left content + right DP column spanning full height */}
        <div className="msn-body">
          <div className="msn-left">

            {/* Messages area */}
            <div className="msn-main">
              <div className="msn-to-field">
                <span className="msn-to-label">To:</span>
                <span className="msn-to-value">{contactName} <span className="msn-to-label">&lt;{windowId}&gt;</span></span>
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
                  <button className="msn-find-nav" onClick={() => navigate(-1)} disabled={matchIndices.length === 0} title="Previous">▲</button>
                  <button className="msn-find-nav" onClick={() => navigate(1)}  disabled={matchIndices.length === 0} title="Next">▼</button>
                  <button className="msn-find-close" onClick={() => setShowFind(false)} title="Close">&#x2715;</button>
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
                      const item    = items[vItem.index]
                      const isMatch = matchIndexSet.has(vItem.index)
                      const isActive= isMatch && matchIndices[findIdx] === vItem.index
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
                              timeStr={item.timeStr}
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

            {/* Input section */}
            <div className="msn-input-section">
              <div className="msn-format-bar">
                <button className="msn-fmt-btn msn-fmt-font" title="Font">A</button>
                <button className="msn-fmt-btn" title="Emoticons">😊 ▾</button>
                <button className="msn-fmt-btn msn-fmt-voice" title="Voice Clip">🎤 Voice Clip ▾</button>
                <button className="msn-fmt-btn" title="Emoticons">😊 ▾</button>
                <button className="msn-fmt-btn" title="Background">🖼</button>
                <button className="msn-fmt-btn" title="Winks">🌸</button>
                <button className="msn-fmt-btn" title="Nudge">🔔</button>
              </div>
              <div className="msn-input-row">
                <textarea className="msn-textarea" readOnly placeholder="" />
                <div className="msn-send-col">
                  <button className="msn-send-btn">Send</button>
                  <button
                    className={`msn-search-btn ${showFind ? 'msn-search-btn-active' : ''}`}
                    onClick={() => setShowFind(v => !v)}
                  >Search</button>
                  <div className="msn-handwriting-btns">
                    <button className="msn-hw-btn" title="Handwriting">✏</button>
                    <button className="msn-hw-btn" title="Font color">A</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* DP column — spans full height of body */}
          <div className="msn-dp-col">
            <div className="msn-dp-section msn-dp-contact">
              <div className="msn-dp-box">
                <span className="msn-dp-icon">🦋</span>
              </div>
              <button className="msn-dp-arrow">▾</button>
            </div>
            <div className="msn-dp-section msn-dp-user">
              <div className="msn-dp-box">
                <span className="msn-dp-icon">🦋</span>
              </div>
              <button className="msn-dp-arrow">▾</button>
            </div>
          </div>

        </div>

        <div className="msn-statusbar">
          Click for new Emoticons and Theme Packs from Blue Mountain
        </div>
      </div>
    </>
  )
}
