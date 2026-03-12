import { XMLParser } from 'fast-xml-parser'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import type { ConversationMeta, ChatEvent, ConversationDetail } from './types.js'

const DATA_DIR = join(process.cwd(), 'data')
const ACCOUNTS = [
  { name: 'slimy2dmax1692689797_1', historyDir: 'history' },
  { name: 'slimy2dmax1692689797_2', historyDir: 'History' },
]

const conversationCache = new Map<string, ConversationDetail>()
const searchIndex = new Map<string, string>() // id -> stripped lowercase text

function extractText(xml: string): string {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
}

export function buildSearchIndex(): void {
  for (const account of ACCOUNTS) {
    const histDir = join(DATA_DIR, account.name, account.historyDir)
    if (!existsSync(histDir)) continue
    const files = readdirSync(histDir).filter(f => f.endsWith('.xml') && f !== 'MessageLog.xsl')
    for (const file of files) {
      const filename = basename(file, '.xml')
      const id = `${account.name}/${filename}`
      if (searchIndex.has(id)) continue
      try {
        const content = readFileSync(join(histDir, file), 'utf-8')
        searchIndex.set(id, extractText(content))
      } catch { /* skip unreadable */ }
    }
  }
}

export function searchConversations(term: string): string[] {
  const lower = term.toLowerCase()
  const results: string[] = []
  for (const [id, text] of searchIndex) {
    if (text.includes(lower)) results.push(id)
  }
  return results
}

export function stripNumericSuffix(filename: string): string {
  // "username102425597" -> "username"
  // "username102425597 - Archive likr 30 times" -> "username"
  // "user_name13092577139" -> "user_name"
  const base = filename.split(' ')[0]  // drop any " - ..." suffix
  return base.replace(/\d+$/, '').replace(/_$/, '')
}

function parseFirstDate(content: string): string {
  const match = content.match(/DateTime="([^"]+)"/)
  return match ? match[1] : ''
}

function parseLastDate(content: string): string {
  const matches = [...content.matchAll(/DateTime="([^"]+)"/g)]
  return matches.length > 0 ? matches[matches.length - 1][1] : ''
}

function parseContactDisplayName(content: string): string {
  // Scan all FriendlyName attributes and return the first one that isn't Dustin
  const re = /FriendlyName="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (!m[1].startsWith('Dustin')) return m[1]
  }
  return ''
}

function countMessages(content: string): number {
  let count = 0
  let pos = 0
  while ((pos = content.indexOf('<Message ', pos)) !== -1) {
    count++
    pos += 9
  }
  return count
}

export function scanAllConversations(): ConversationMeta[] {
  const results: ConversationMeta[] = []

  for (const account of ACCOUNTS) {
    const histDir = join(DATA_DIR, account.name, account.historyDir)
    if (!existsSync(histDir)) continue

    const files = readdirSync(histDir).filter(f => f.endsWith('.xml') && f !== 'MessageLog.xsl')

    for (const file of files) {
      const filename = basename(file, '.xml')
      const filePath = join(histDir, file)

      try {
        const content = readFileSync(filePath, 'utf-8')
        const firstDate = parseFirstDate(content)
        const lastDate = parseLastDate(content)
        const messageCount = countMessages(content)
        const contactSlug = stripNumericSuffix(filename)
        const displayName = parseContactDisplayName(content)

        results.push({
          id: `${account.name}/${filename}`,
          account: account.name,
          filename,
          contactSlug,
          displayName,
          firstDate,
          lastDate,
          messageCount,
        })
      } catch {
        // skip unreadable files
      }
    }
  }

  return results.sort((a, b) => a.contactSlug.localeCompare(b.contactSlug))
}

function getUser(node: Record<string, unknown>): { from: string; to: string } {
  const fromNode = node['From'] as Record<string, unknown> | undefined
  const toNode = node['To'] as Record<string, unknown> | undefined
  const fromUser = fromNode?.['User'] as Record<string, unknown> | undefined
  const toUser = toNode?.['User'] as Record<string, unknown> | undefined
  return {
    from: (fromUser?.['@_FriendlyName'] as string) ?? '',
    to: (toUser?.['@_FriendlyName'] as string) ?? '',
  }
}

export function parseConversation(account: string, filename: string): ConversationDetail {
  const cacheKey = `${account}/${filename}`
  if (conversationCache.has(cacheKey)) {
    return conversationCache.get(cacheKey)!
  }

  const accountInfo = ACCOUNTS.find(a => a.name === account)
  if (!accountInfo) throw new Error(`Unknown account: ${account}`)

  const filePath = join(DATA_DIR, account, accountInfo.historyDir, `${filename}.xml`)
  const content = readFileSync(filePath, 'utf-8')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['Message', 'Invitation', 'InvitationResponse'].includes(name),
  })

  const parsed = parser.parse(content)
  const log = (parsed['Log'] ?? {}) as Record<string, unknown>

  const messages: ChatEvent[] = []

  const rawMessages = (log['Message'] as Record<string, unknown>[] | undefined) ?? []
  for (const msg of rawMessages) {
    const { from, to } = getUser(msg)
    const textNode = msg['Text'] as Record<string, unknown> | string | undefined
    const text = typeof textNode === 'object' && textNode !== null
      ? (textNode['#text'] as string) ?? ''
      : (textNode as string) ?? ''
    const style = typeof textNode === 'object' && textNode !== null
      ? (textNode['@_Style'] as string) ?? ''
      : ''

    messages.push({
      type: 'message',
      dateTime: (msg['@_DateTime'] as string) ?? '',
      sessionId: Number(msg['@_SessionID'] ?? 0),
      fromName: from,
      toName: to,
      text,
      style,
      isYou: from.startsWith('Dustin'),
    })
  }

  const invitations = (log['Invitation'] as Record<string, unknown>[] | undefined) ?? []
  for (const inv of invitations) {
    const { from, to } = getUser(inv)
    const fileNode = inv['File'] as Record<string, unknown> | undefined
    const fileName = (fileNode?.['@_Name'] as string) ?? ''

    messages.push({
      type: 'invitation',
      dateTime: (inv['@_DateTime'] as string) ?? '',
      sessionId: Number(inv['@_SessionID'] ?? 0),
      fromName: from,
      toName: to,
      text: `Sent file: ${fileName}`,
      style: '',
      isYou: from.startsWith('Dustin'),
      file: fileName,
    })
  }

  const invResponses = (log['InvitationResponse'] as Record<string, unknown>[] | undefined) ?? []
  for (const resp of invResponses) {
    const { from, to } = getUser(resp)
    const fileNode = resp['File'] as Record<string, unknown> | undefined
    const fileName = (fileNode?.['@_Name'] as string) ?? ''

    messages.push({
      type: 'invitationResponse',
      dateTime: (resp['@_DateTime'] as string) ?? '',
      sessionId: Number(resp['@_SessionID'] ?? 0),
      fromName: from,
      toName: to,
      text: `File transfer: ${fileName}`,
      style: '',
      isYou: from.startsWith('Dustin'),
      file: fileName,
    })
  }

  // Sort by dateTime
  messages.sort((a, b) => a.dateTime.localeCompare(b.dateTime))

  const firstDate = messages[0]?.dateTime ?? ''
  const lastDate = messages[messages.length - 1]?.dateTime ?? ''
  const contactSlug = stripNumericSuffix(filename)
  const displayName = parseContactDisplayName(content)

  const meta: ConversationMeta = {
    id: cacheKey,
    account,
    filename,
    contactSlug,
    displayName,
    firstDate,
    lastDate,
    messageCount: rawMessages.length,
  }

  const detail: ConversationDetail = { meta, messages }
  conversationCache.set(cacheKey, detail)
  return detail
}
