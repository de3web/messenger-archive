interface Props {
  showFind: boolean
  onToggleFind: () => void
}

export default function ChatInputSection({ showFind, onToggleFind }: Props) {
  return (
    <div className="msn-input-section">
      <div className="msn-format-bar">
        <button className="msn-fmt-btn msn-fmt-font" title="Font" aria-label="Font">A</button>
        <button className="msn-fmt-btn" title="Emoticons" aria-label="Emoticons">😊 ▾</button>
        <button className="msn-fmt-btn msn-fmt-voice" title="Voice Clip" aria-label="Voice Clip">🎤 Voice Clip ▾</button>
        <button className="msn-fmt-btn" title="Emoticons" aria-label="Emoticons">😊 ▾</button>
        <button className="msn-fmt-btn" title="Background" aria-label="Background">🖼</button>
        <button className="msn-fmt-btn" title="Winks" aria-label="Winks">🌸</button>
        <button className="msn-fmt-btn" title="Nudge" aria-label="Nudge">🔔</button>
      </div>
      <div className="msn-input-row">
        <textarea className="msn-textarea" readOnly placeholder="" aria-label="Message input (read-only archive)" />
        <div className="msn-send-col">
          <button className="msn-send-btn">Send</button>
          <button
            className={`msn-search-btn ${showFind ? 'msn-search-btn-active' : ''}`}
            onClick={onToggleFind}
            aria-label={showFind ? 'Hide find bar' : 'Search in conversation'}
            aria-pressed={showFind}
          >Search</button>
          <div className="msn-handwriting-btns">
            <button className="msn-hw-btn" title="Handwriting" aria-label="Handwriting">✏</button>
            <button className="msn-hw-btn" title="Font color" aria-label="Font color">A</button>
          </div>
        </div>
      </div>
    </div>
  )
}
