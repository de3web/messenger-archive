import { useState, useEffect, useRef } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import './Sidebar.css'
import type { ConversationMeta } from '../App'

interface Props {
  conversations: ConversationMeta[]
  loading: boolean
  error: string | null
  openWindowIds: Set<string>
  focusedId: string | null
  onSelect: (id: string, conversations: ConversationMeta[]) => void
}

interface ContactGroup {
  id: string               // = contactSlug (unique group key)
  name: string             // = best display name
  allConversations: ConversationMeta[]
  firstDate: string
  lastDate: string
}

function yearRange(firstDate: string, lastDate: string): string {
  if (!firstDate) return ''
  const first = new Date(firstDate).getFullYear()
  const last  = new Date(lastDate).getFullYear()
  return first === last ? String(first) : `${first}–${last}`
}

function buildGroups(
  conversations: ConversationMeta[],
  matchingIds: Set<string> | null,
): ContactGroup[] {
  const map = new Map<string, ConversationMeta[]>()
  for (const conv of conversations) {
    const key = conv.contactSlug
    const bucket = map.get(key) ?? []
    bucket.push(conv)
    map.set(key, bucket)
  }

  const groups: ContactGroup[] = []
  for (const [slug, convs] of map) {
    if (matchingIds) {
      const hasMatch = convs.some(c => matchingIds.has(c.id))
      if (!hasMatch) continue
    }
    const bestName = convs.map(c => c.displayName).find(n => n && n !== slug) ?? slug
    const dates = convs.flatMap(c => [c.firstDate, c.lastDate]).filter(Boolean).sort()
    groups.push({
      id: slug,
      name: bestName,
      allConversations: convs,
      firstDate: dates[0] ?? '',
      lastDate:  dates[dates.length - 1] ?? '',
    })
  }

  return groups.sort((a, b) => a.name.localeCompare(b.name))
}

export default function Sidebar({ conversations, loading, error, openWindowIds = new Set(), focusedId, onSelect }: Props) {
  const [nameSearch, setNameSearch]         = useState('')
  const [convSearch, setConvSearch]         = useState('')
  const [convTerm, setConvTerm]             = useState('')
  const [matchingIds, setMatchingIds]       = useState<Set<string> | null>(null)
  const [convSearching, setConvSearching]   = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setConvTerm(convSearch.trim()), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [convSearch])

  useEffect(() => {
    if (convTerm.length < 2) { setMatchingIds(null); return }
    setConvSearching(true)
    fetch(`/api/search?q=${encodeURIComponent(convTerm)}`)
      .then(r => r.json())
      .then(data => { setMatchingIds(new Set<string>(data.ids)); setConvSearching(false) })
      .catch(() => setConvSearching(false))
  }, [convTerm])

  const nameFiltered = conversations.filter(c =>
    (c.displayName || c.contactSlug).toLowerCase().includes(nameSearch.toLowerCase())
  )

  const groups       = buildGroups(nameFiltered, matchingIds)
  const convSearchActive = convTerm.length >= 2

  return (
    <div className="msn-sidebar">

      {/* Title bar */}
      <div className="msn-sidebar-titlebar">
        <div className="msn-sidebar-titlebar-left">
          <span className="msn-sidebar-titlebar-icon">💬</span>
          <span className="msn-sidebar-titlebar-title">MSN Messenger</span>
        </div>
        <div className="msn-sidebar-titlebar-controls">
          <button className="msn-ctrl msn-ctrl-min" title="Minimize">&#x2013;</button>
          <button className="msn-ctrl msn-ctrl-max" title="Maximize">&#x25A1;</button>
          <button className="msn-ctrl msn-ctrl-close" title="Close">&#x2715;</button>
        </div>
      </div>

      {/* Menu bar */}
      <div className="msn-sidebar-menubar">
        {['File', 'Contacts', 'Actions', 'Tools', 'Help'].map(m => (
          <span key={m} className="msn-sidebar-menu-item">{m}</span>
        ))}
      </div>

      {/* Brand header */}
      <div className="msn-sidebar-brand">
        <span className="msn-sidebar-brand-butterfly">🦋</span>
        <span className="msn-sidebar-brand-msn">msn</span>
        <span className="msn-sidebar-brand-messenger"> Messenger</span>
      </div>

      {/* User profile */}
      <div className="msn-sidebar-profile">
        <div className="msn-sidebar-avatar">
          <svg viewBox="0 0 20 20" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="6.5" r="4" fill="#fff" />
            <path d="M1 19 Q1 12 10 12 Q19 12 19 19 Z" fill="#fff" />
          </svg>
        </div>
        <div className="msn-sidebar-profile-right">
          <div className="msn-sidebar-profile-name">
            Dustin <span className="msn-sidebar-profile-status">(Online)</span>
          </div>
          <div className="msn-sidebar-personal-msg">&lt;Type a personal message&gt;</div>
        </div>
      </div>

      {/* Search fields */}
      <div className="msn-sidebar-search-wrap">
        <input
          className="msn-sidebar-search"
          type="text"
          placeholder="Search contacts..."
          value={nameSearch}
          onChange={e => setNameSearch(e.target.value)}
        />
        <div className="msn-sidebar-search-conv-wrap">
          <input
            className={`msn-sidebar-search msn-sidebar-search-conv ${convSearchActive ? 'msn-sidebar-search-active' : ''}`}
            type="text"
            placeholder="Search conversations..."
            value={convSearch}
            onChange={e => setConvSearch(e.target.value)}
          />
          {convSearching && <span className="msn-sidebar-search-spinner">⏳</span>}
          {convSearch && !convSearching && (
            <button
              className="msn-sidebar-search-clear"
              onClick={() => { setConvSearch(''); setConvTerm('') }}
              title="Clear"
            >&#x2715;</button>
          )}
        </div>
      </div>

      {/* Contact list */}
      <OverlayScrollbarsComponent className="msn-sidebar-list" options={{ scrollbars: { autoHide: 'never', theme: 'os-theme-xp' } }}>
        {loading && <div className="msn-sidebar-status">Loading...</div>}
        {error   && <div className="msn-sidebar-status msn-sidebar-error">Error: {error}</div>}
        {!loading && !error && groups.length === 0 && (
          <div className="msn-sidebar-status">
            {convSearchActive ? `No conversations containing "${convTerm}"` : 'No contacts found.'}
          </div>
        )}
        {groups.map(group => {
          const years     = yearRange(group.firstDate, group.lastDate)
          const isOpen    = openWindowIds.has(group.id)
          const isFocused = focusedId === group.id
          return (
            <button
              key={group.id}
              className={`msn-contact-item ${isFocused ? 'msn-contact-focused' : isOpen ? 'msn-contact-open' : ''}`}
              onClick={() => onSelect(group.id, group.allConversations)}
            >
              <div className="msn-contact-avatar">
                <img src="/src/assets/messenger_online_icon.png" alt="" className="msn-contact-avatar-img" />
              </div>
              <div className="msn-contact-info">
                <span className="msn-contact-name">{group.name}</span>
                {years && <span className="msn-contact-meta"> – {years}</span>}
              </div>
            </button>
          )
        })}
      </OverlayScrollbarsComponent>

      {/* Bottom banner */}
      <div className="msn-sidebar-banner">
        <span className="msn-banner-butterfly">🦋</span>
        <div className="msn-banner-text">
          <span className="msn-banner-msn">msn</span>
          <span className="msn-banner-messenger"> Messenger</span>
          <span className="msn-banner-net">.net</span>
        </div>
      </div>

    </div>
  )
}
