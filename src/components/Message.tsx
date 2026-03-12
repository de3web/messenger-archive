import type { CSSProperties } from 'react'
import type { ChatEvent } from './ChatWindow'
import { parseEmoticons } from '../utils/emoticons'
import './Message.css'

interface Props {
  event: ChatEvent
  timeStr: string
  highlightTerm?: string
  isActiveMatch?: boolean
}

function parseStyle(styleStr: string): CSSProperties {
  if (!styleStr) return {}
  const result: CSSProperties = {}
  const declarations = styleStr.split(';')
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':')
    if (colonIdx === -1) continue
    const prop = decl.slice(0, colonIdx).trim()
    const value = decl.slice(colonIdx + 1).trim()
    if (!prop || !value) continue
    switch (prop) {
      case 'font-family':  result.fontFamily = value; break
      case 'font-size':    result.fontSize = value; break
      case 'font-weight':  result.fontWeight = value as CSSProperties['fontWeight']; break
      case 'font-style':   result.fontStyle = value as CSSProperties['fontStyle']; break
      case 'color':        result.color = value; break
      case 'text-decoration': result.textDecoration = value; break
    }
  }
  return result
}

function highlightParts(str: string, term: string, keyPrefix: string): React.ReactNode {
  if (!term) return str
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = str.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={`${keyPrefix}-${i}`} className="search-match">{part}</mark>
      : part || null
  )
}

function renderText(text: string, term: string): React.ReactNode {
  const str = String(text ?? '')
  if (!str) return <em className="message-empty">(empty)</em>

  const segments = parseEmoticons(str)

  return segments.map((seg, i) => {
    if (seg.type === 'emoticon') {
      return <span key={i} className="msn-emoticon" title={seg.code}>{seg.emoji}</span>
    }
    return <span key={i}>{highlightParts(seg.value, term, String(i))}</span>
  })
}

export default function Message({ event, timeStr, highlightTerm = '', isActiveMatch = false }: Props) {
  if (event.type === 'invitation' || event.type === 'invitationResponse') {
    return (
      <div className="message-system">
        <span>{renderText(event.text, highlightTerm)}</span>
      </div>
    )
  }

  const textStyle = parseStyle(event.style)

  return (
    <div className={`message ${event.isYou ? 'message-you' : 'message-them'} ${isActiveMatch ? 'message-active-match' : ''}`}>
      <div className="message-header">
        <span className="message-name">{event.fromName}:</span>
      </div>
      <div className="message-text" style={textStyle}>
        {renderText(event.text, highlightTerm)}
      </div>
    </div>
  )
}
