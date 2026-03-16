import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { DisplayItem } from '../types/chat'

export function useFindInChat(
  items: DisplayItem[],
  scrollToIndex: (index: number, opts: { align: string; behavior: string }) => void,
) {
  const [showFind, setShowFind] = useState(false)
  const [findInput, setFindInput] = useState('')
  const [findTerm, setFindTerm]   = useState('')
  const [findIdx, setFindIdx]     = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = setTimeout(() => setFindTerm(findInput), 300)
    return () => clearTimeout(id)
  }, [findInput])

  useEffect(() => {
    if (showFind) findInputRef.current?.focus()
    else { setFindInput(''); setFindTerm(''); setFindIdx(0) }
  }, [showFind])

  useEffect(() => { setFindIdx(0) }, [findTerm])

  const lowerFind = findTerm.trim().length >= 2 ? findTerm.trim().toLowerCase() : ''

  const matchIndices = useMemo(() => {
    if (!lowerFind) return []
    const result: number[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'message' && String(item.event.text).toLowerCase().includes(lowerFind)) {
        result.push(i)
      }
    }
    return result
  }, [items, lowerFind])

  const matchIndexSet = useMemo(() => new Set(matchIndices), [matchIndices])

  useEffect(() => {
    if (!matchIndices.length) return
    scrollToIndex(matchIndices[findIdx], { align: 'center', behavior: 'smooth' })
  }, [findIdx, matchIndices])

  const navigate = useCallback((dir: 1 | -1) => {
    if (!matchIndices.length) return
    setFindIdx(i => (i + dir + matchIndices.length) % matchIndices.length)
  }, [matchIndices])

  return {
    showFind, setShowFind,
    findInput, setFindInput,
    findTerm, findInputRef,
    lowerFind, matchIndices, matchIndexSet, findIdx,
    navigate,
  }
}
