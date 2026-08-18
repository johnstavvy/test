import { useEffect, useState } from 'react'

// Drives a "grow in from zero" mount animation for charts (bars, donut arcs):
// pair `grown` with the 0-state vs target-state of a data-driven style value
// (width%, height%, strokeDasharray, ...) on an element that already has a
// `transition-all` class. Since routed pages fully remount on navigation
// (see the `key={location.pathname}` wrapper in App.tsx), this reliably
// re-fires the grow-in every time the user navigates to a chart's page.
//
// `settled` stays false for `duration`ms after the grow-in starts, so a
// caller can use a longer transition-duration for the initial grow and a
// snappier one for later same-page updates (e.g. selecting a different day
// on a bar chart) — see callers for the `settled ? 'duration-200' : 'duration-700'` pattern.
export function useGrowIn(duration = 700) {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [grown, setGrown] = useState(reduceMotion)
  const [settled, setSettled] = useState(reduceMotion)

  useEffect(() => {
    if (reduceMotion) return
    const raf = requestAnimationFrame(() => setGrown(true))
    const t = setTimeout(() => setSettled(true), duration + 50)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [duration]) // eslint-disable-line react-hooks/exhaustive-deps

  return { grown, settled }
}
