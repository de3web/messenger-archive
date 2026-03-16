import { useState, useEffect, useRef } from 'react'

export const WIN_W   = 680
export const WIN_H   = 530
const CASCADE = 28

export function useDragWindow(stackIndex: number, windowId: string, onFocus: () => void) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const windowRef     = useRef<HTMLDivElement>(null)
  const drag          = useRef({ active: false, ox: 0, oy: 0, x: 0, y: 0 })

  useEffect(() => {
    const offset = stackIndex * CASCADE
    const x = Math.round(Math.max(0, (window.innerWidth  - WIN_W) / 2)) + offset
    const y = Math.round(Math.max(0, (window.innerHeight - WIN_H) / 2)) + offset
    setPos({ x, y })
  }, [windowId])

  useEffect(() => {
    const el = windowRef.current
    if (el) { el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px` }
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active || !windowRef.current) return
      const x = Math.max(-WIN_W + 120, Math.min(window.innerWidth  - 120, e.clientX - drag.current.ox))
      const y = Math.max(0,            Math.min(window.innerHeight -  40, e.clientY - drag.current.oy))
      drag.current.x = x; drag.current.y = y
      windowRef.current.style.left = `${x}px`
      windowRef.current.style.top  = `${y}px`
    }
    const onUp = () => {
      if (!drag.current.active) return
      drag.current.active = false
      setPos({ x: drag.current.x, y: drag.current.y })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  const onTitleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { active: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y, x: pos.x, y: pos.y }
    e.preventDefault()
    onFocus()
  }

  return { windowRef, pos, onTitleMouseDown }
}
