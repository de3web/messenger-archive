import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  onClose?: () => void
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="msn-window" style={{ display: 'flex', left: 120, top: 120, zIndex: 9999 }}>
          <div className="msn-titlebar">
            <div className="msn-titlebar-left">
              <span className="msn-titlebar-appicon">⚠️</span>
              <span className="msn-titlebar-title">Error</span>
            </div>
            {this.props.onClose && (
              <div className="msn-titlebar-controls">
                <button className="msn-ctrl msn-ctrl-close" onClick={this.props.onClose}>&#x2715;</button>
              </div>
            )}
          </div>
          <div style={{ padding: '16px', fontSize: 13, color: '#333' }}>
            <p><strong>Something went wrong loading this conversation.</strong></p>
            <p style={{ color: '#888', marginTop: 8 }}>{this.state.error.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
