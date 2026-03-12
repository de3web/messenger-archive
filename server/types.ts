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

export interface ConversationDetail {
  meta: ConversationMeta
  messages: ChatEvent[]
}
