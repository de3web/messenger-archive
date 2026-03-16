import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import type { ConversationMeta } from './types.js'
import { DATA_DIR, ACCOUNTS, OWNER_NAME } from './config.js'

export function stripNumericSuffix(filename: string): string {
  // e.g. "username12345" -> "username"
  // e.g. "username12345 - Archive copy" -> "username"
  const base = filename.split(' ')[0]
  return base.replace(/\d+$/, '').replace(/_$/, '')
}

export function parseContactDisplayName(content: string): string {
  const re = /FriendlyName="([^"]+)"/g
  const candidates = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const name = m[1]
    if ((!OWNER_NAME || !name.startsWith(OWNER_NAME)) && name.length <= 40) candidates.add(name)
  }
  if (!candidates.size) return ''
  return [...candidates].sort((a, b) => a.length - b.length)[0]
}

function parseFirstDate(content: string): string {
  const match = content.match(/DateTime="([^"]+)"/)
  return match ? match[1] : ''
}

function parseLastDate(content: string): string {
  const matches = [...content.matchAll(/DateTime="([^"]+)"/g)]
  return matches.length > 0 ? matches[matches.length - 1][1] : ''
}

function countMessages(content: string): number {
  let count = 0
  let pos = 0
  while ((pos = content.indexOf('<Message ', pos)) !== -1) { count++; pos += 9 }
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
      try {
        const content = readFileSync(join(histDir, file), 'utf-8')
        results.push({
          id: `${account.name}/${filename}`,
          account: account.name,
          filename,
          contactSlug: stripNumericSuffix(filename),
          displayName: parseContactDisplayName(content),
          firstDate:   parseFirstDate(content),
          lastDate:    parseLastDate(content),
          messageCount: countMessages(content),
        })
      } catch { /* skip unreadable files */ }
    }
  }

  return results.sort((a, b) => a.contactSlug.localeCompare(b.contactSlug))
}
