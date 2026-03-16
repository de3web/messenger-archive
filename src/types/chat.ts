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

export type DisplayItem =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; event: ChatEvent }
