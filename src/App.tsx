import { useState, useEffect } from 'react'
import './App.css'
import 'overlayscrollbars/overlayscrollbars.css'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export interface ConversationMeta {
  id: string
  account: string
  filename: string
  contactSlug: string
  displayName: string
  firstDate: string
  lastDate: string
  messageCount: number
}

interface OpenWindow {
  id: string                       // contact display name — unique group key
  conversations: ConversationMeta[]
}

function App() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [openWindows, setOpenWindows]     = useState<OpenWindow[]>([])

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then((data: ConversationMeta[]) => { setConversations(data); setLoading(false) })
      .catch(err => { setError(String(err)); setLoading(false) })
  }, [])

  const handleSelect = (id: string, convs: ConversationMeta[]) => {
    setOpenWindows(prev => {
      const idx = prev.findIndex(w => w.id === id)
      if (idx !== -1) {
        // Already open — bring to front
        const updated = [...prev]
        const [win] = updated.splice(idx, 1)
        return [...updated, win]
      }
      return [...prev, { id, conversations: convs }]
    })
  }

  const handleClose = (id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id))
  }

  const handleFocus = (id: string) => {
    setOpenWindows(prev => {
      const idx = prev.findIndex(w => w.id === id)
      if (idx === -1 || idx === prev.length - 1) return prev
      const updated = [...prev]
      const [win] = updated.splice(idx, 1)
      return [...updated, win]
    })
  }

  const openWindowIds = new Set(openWindows.map(w => w.id))
  const focusedId     = openWindows.at(-1)?.id ?? null

  return (
    <div className="app-layout">
      <Sidebar
        conversations={conversations}
        loading={loading}
        error={error}
        openWindowIds={openWindowIds}
        focusedId={focusedId}
        onSelect={handleSelect}
      />
      {/* Transparent flex spacer — lets wallpaper show through */}
      <div className="app-desktop" />
      {openWindows.map((win, idx) => (
        <ChatWindow
          key={win.id}
          windowId={win.id}
          conversations={win.conversations}
          zIndex={1000 + idx}
          stackIndex={idx}
          onClose={() => handleClose(win.id)}
          onFocus={() => handleFocus(win.id)}
        />
      ))}
    </div>
  )
}

export default App
