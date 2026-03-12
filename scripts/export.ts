/**
 * Export all MSN Messenger conversation history to JSON.
 *
 * Usage:  npm run export
 * Output: data/export/_index.json        — metadata for every conversation
 *         data/export/<account>__<file>.json — full message log per conversation
 */

import { scanAllConversations, parseConversation } from '../server/parser.js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const outDir = join(process.cwd(), 'data', 'export')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

const conversations = scanAllConversations()
console.log(`Found ${conversations.length} conversations. Exporting...`)

let exported = 0
let failed = 0

for (const meta of conversations) {
  try {
    const detail = parseConversation(meta.account, meta.filename)
    const outFile = join(outDir, `${meta.account}__${meta.filename}.json`)
    writeFileSync(outFile, JSON.stringify(detail, null, 2), 'utf-8')
    exported++
  } catch (err) {
    console.error(`  FAILED: ${meta.id} —`, err)
    failed++
  }
}

// Write an index of all conversations (metadata only, no messages)
const index = conversations.map(c => ({
  id: c.id,
  displayName: c.displayName || c.contactSlug,
  contactSlug: c.contactSlug,
  account: c.account,
  firstDate: c.firstDate,
  lastDate: c.lastDate,
  messageCount: c.messageCount,
  file: `${c.account}__${c.filename}.json`,
}))

writeFileSync(join(outDir, '_index.json'), JSON.stringify(index, null, 2), 'utf-8')

console.log(`\nDone.`)
console.log(`  Exported : ${exported} conversations`)
if (failed > 0) console.log(`  Failed   : ${failed} conversations`)
console.log(`  Location : data/export/`)
console.log(`  Index    : data/export/_index.json`)
