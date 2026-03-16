import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, basename } from 'path'
import { DATA_DIR, ACCOUNTS } from './config.js'

const CACHE_PATH = join(DATA_DIR, 'search-cache.json')

interface CacheEntry { mtime: number; text: string }
type CacheFile = Record<string, CacheEntry>

function loadCache(): CacheFile {
  if (!existsSync(CACHE_PATH)) return {}
  try { return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as CacheFile }
  catch { return {} }
}

function saveCache(cache: CacheFile): void {
  try { writeFileSync(CACHE_PATH, JSON.stringify(cache)) }
  catch (e) { console.warn('[msn-archive] Could not save search cache:', e) }
}

function extractText(xml: string): string {
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
}

const searchIndex = new Map<string, string>()

export function buildSearchIndex(): void {
  const cache = loadCache()
  let dirty = false

  for (const account of ACCOUNTS) {
    const histDir = join(DATA_DIR, account.name, account.historyDir)
    if (!existsSync(histDir)) continue

    const files = readdirSync(histDir).filter(f => f.endsWith('.xml') && f !== 'MessageLog.xsl')
    for (const file of files) {
      const id       = `${account.name}/${basename(file, '.xml')}`
      const filePath = join(histDir, file)
      try {
        const mtime  = statSync(filePath).mtimeMs
        const cached = cache[id]
        if (cached && cached.mtime === mtime) {
          searchIndex.set(id, cached.text)
        } else {
          const text = extractText(readFileSync(filePath, 'utf-8'))
          searchIndex.set(id, text)
          cache[id] = { mtime, text }
          dirty = true
        }
      } catch { /* skip unreadable */ }
    }
  }

  if (dirty) saveCache(cache)
}

export function searchConversations(term: string): string[] {
  const lower = term.toLowerCase()
  const results: string[] = []
  for (const [id, text] of searchIndex) {
    if (text.includes(lower)) results.push(id)
  }
  return results
}
