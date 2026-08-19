import { useLayoutEffect, useRef, useState } from 'react'

// Tracks the on-screen rect of whichever nav item is "active" (by key) relative to
// its container, so a shared highlight element can glide to sit behind it — the
// iOS tab-bar "liquid glass" pill effect. Re-measures on every dependency change
// (route change, menu-order change) and on window resize.
export function useActivePill(activeKey: string, deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const [rect, setRect] = useState<{ start: number; size: number } | null>(null)

  function registerRef(key: string) {
    return (el: HTMLElement | null) => {
      if (el) itemRefs.current.set(key, el)
      else itemRefs.current.delete(key)
    }
  }

  useLayoutEffect(() => {
    function update() {
      const container = containerRef.current
      const el = itemRefs.current.get(activeKey)
      if (!container || !el) return
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      setRect({ start: elRect.left - containerRect.left, size: elRect.width })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, ...deps])

  return { containerRef, registerRef, rect }
}
