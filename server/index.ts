import express from 'express'
import { scanAllConversations, parseConversation, buildSearchIndex, searchConversations } from './parser.js'

const app = express()
const PORT = 3002

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  next()
})

app.get('/api/conversations', (_req, res) => {
  try {
    res.json(scanAllConversations())
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to scan conversations' })
  }
})

app.get('/api/conversations/:account/:filename', (req, res) => {
  const { account, filename } = req.params
  try {
    res.json(parseConversation(account, filename))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to parse conversation' })
  }
})

app.get('/api/search', (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (q.length < 2) return res.json({ ids: [] })
  try {
    res.json({ ids: searchConversations(q) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Search failed' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  // Build search index in background so first search is instant
  setImmediate(() => {
    console.log('Building search index...')
    buildSearchIndex()
    console.log('Search index ready.')
  })
})
