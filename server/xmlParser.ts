import { XMLParser } from 'fast-xml-parser'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { ConversationMeta, ChatEvent, ConversationDetail } from './types.js'
import { DATA_DIR, ACCOUNTS, OWNER_NAME } from './config.js'
import { stripNumericSuffix, parseContactDisplayName } from './scanner.js'

const conversationCache = new Map<string, ConversationDetail>()

function getUser(node: Record<string, unknown>): { from: string; to: string } {
  const fromUser = (node['From'] as Record<string, unknown> | undefined)?.['User'] as Record<string, unknown> | undefined
  const toUser   = (node['To']   as Record<string, unknown> | undefined)?.['User'] as Record<string, unknown> | undefined
  return {
    from: (fromUser?.['@_FriendlyName'] as string) ?? '',
    to:   (toUser?.['@_FriendlyName']   as string) ?? '',
  }
}

export function parseConversation(account: string, filename: string): ConversationDetail {
  const cacheKey = `${account}/${filename}`
  if (conversationCache.has(cacheKey)) return conversationCache.get(cacheKey)!

  const accountInfo = ACCOUNTS.find(a => a.name === account)
  if (!accountInfo) throw new Error(`Unknown account: ${account}`)

  const content = readFileSync(join(DATA_DIR, account, accountInfo.historyDir, `${filename}.xml`), 'utf-8')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['Message', 'Invitation', 'InvitationResponse'].includes(name),
  })

  const log = ((parser.parse(content)['Log'] ?? {}) as Record<string, unknown>)
  const messages: ChatEvent[] = []

  for (const msg of (log['Message'] as Record<string, unknown>[] | undefined) ?? []) {
    const { from, to } = getUser(msg)
    const textNode = msg['Text'] as Record<string, unknown> | string | undefined
    const isObj    = typeof textNode === 'object' && textNode !== null
    messages.push({
      type:      'message',
      dateTime:  (msg['@_DateTime']  as string) ?? '',
      sessionId: Number(msg['@_SessionID'] ?? 0),
      fromName:  from,
      toName:    to,
      text:      isObj ? (textNode['#text']    as string) ?? '' : (textNode as string) ?? '',
      style:     isObj ? (textNode['@_Style']  as string) ?? '' : '',
      isYou:     OWNER_NAME ? from.startsWith(OWNER_NAME) : false,
    })
  }

  for (const inv of (log['Invitation'] as Record<string, unknown>[] | undefined) ?? []) {
    const { from, to } = getUser(inv)
    const fileName = ((inv['File'] as Record<string, unknown> | undefined)?.['@_Name'] as string) ?? ''
    messages.push({
      type: 'invitation', dateTime: (inv['@_DateTime'] as string) ?? '',
      sessionId: Number(inv['@_SessionID'] ?? 0), fromName: from, toName: to,
      text: `Sent file: ${fileName}`, style: '', isYou: OWNER_NAME ? from.startsWith(OWNER_NAME) : false, file: fileName,
    })
  }

  for (const resp of (log['InvitationResponse'] as Record<string, unknown>[] | undefined) ?? []) {
    const { from, to } = getUser(resp)
    const fileName = ((resp['File'] as Record<string, unknown> | undefined)?.['@_Name'] as string) ?? ''
    messages.push({
      type: 'invitationResponse', dateTime: (resp['@_DateTime'] as string) ?? '',
      sessionId: Number(resp['@_SessionID'] ?? 0), fromName: from, toName: to,
      text: `File transfer: ${fileName}`, style: '', isYou: OWNER_NAME ? from.startsWith(OWNER_NAME) : false, file: fileName,
    })
  }

  messages.sort((a, b) => a.dateTime.localeCompare(b.dateTime))

  const meta: ConversationMeta = {
    id: cacheKey, account, filename,
    contactSlug:  stripNumericSuffix(filename),
    displayName:  parseContactDisplayName(content),
    firstDate:    messages[0]?.dateTime ?? '',
    lastDate:     messages[messages.length - 1]?.dateTime ?? '',
    messageCount: messages.filter(m => m.type === 'message').length,
  }

  const detail: ConversationDetail = { meta, messages }
  conversationCache.set(cacheKey, detail)
  return detail
}
