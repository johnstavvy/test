import { useEffect, useState } from 'react'

// Measures the app's sticky top header so a page can stack a second sticky bar
// directly beneath it instead of overlapping. Reports 0 on desktop, where the
// header is hidden (`lg:hidden`) and its rendered height collapses to 0.
export function useHeaderHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const observer = new ResizeObserver(() => setHeight(header.getBoundingClientRect().height))
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  return height
}
