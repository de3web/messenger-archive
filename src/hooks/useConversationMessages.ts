import { useState, useEffect } from 'react'
import type { ConversationMeta } from '../App'
import type { ChatEvent } from '../types/chat'

interface ConversationDetail {
  meta: ConversationMeta
  messages: ChatEvent[]
}

export function useConversationMessages(conversations: ConversationMeta[]) {
  const [messages, setMessages] = useState<ChatEvent[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const conversationKey = conversations.map(c => c.id).join(',')

  useEffect(() => {
    if (!conversations.length) return
    setLoading(true)
    setError(null)

    Promise.all(
      conversations.map((c, fileIdx) =>
        fetch(`/api/conversations/${c.account}/${c.filename}`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
          .then((data: ConversationDetail) =>
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

  return { messages, loading, error }
}
