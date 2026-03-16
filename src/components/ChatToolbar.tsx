const TOOLBAR_BTNS = [
  { icon: '👥', label: 'Invite' },
  { icon: '📁', label: 'Send Files' },
  { icon: '📹', label: 'Video' },
  { icon: '🎤', label: 'Voice' },
  { icon: '🎯', label: 'Activities' },
  { icon: '🎮', label: 'Games' },
]

export default function ChatToolbar() {
  return (
    <div className="msn-toolbar">
      <div className="msn-toolbar-buttons">
        {TOOLBAR_BTNS.map(btn => (
          <button key={btn.label} className="msn-toolbar-btn" aria-label={btn.label}>
            <span className="msn-toolbar-btn-icon" aria-hidden="true">{btn.icon}</span>
            <span className="msn-toolbar-btn-label">{btn.label}</span>
          </button>
        ))}
      </div>
      <div className="msn-toolbar-brand">
        <span className="msn-brand-butterfly" aria-hidden="true">🦋</span>
        <span className="msn-brand-text" aria-hidden="true">msn</span>
        <div className="msn-brand-actions">
          <button className="msn-brand-btn" title="Block" aria-label="Block">🚫</button>
          <button className="msn-brand-btn" title="Settings" aria-label="Settings">&#x2699;</button>
        </div>
      </div>
    </div>
  )
}
