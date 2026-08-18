import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const DURATION = 320
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

// Renders `children` inside a rounded panel that visually grows out of `originRect`
// (typically a button's getBoundingClientRect(), captured on click) and shrinks back
// into it on close — a FLIP transform animation, not a full-page route change.
export function ExpandingSheet({
  open,
  originRect,
  onClose,
  title,
  children,
}: {
  open: boolean
  originRect: DOMRect | null
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Mount immediately when opening; on close, animate first and unmount after DURATION.
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const panel = panelRef.current
    if (panel && originRect) {
      const finalRect = panel.getBoundingClientRect()
      const scaleX = originRect.width / finalRect.width
      const scaleY = originRect.height / finalRect.height
      const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2)
      const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2)
      panel.style.transition = `transform ${DURATION}ms ${EASING}, border-radius ${DURATION}ms ${EASING}`
      panel.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
      panel.style.borderRadius = '9999px'
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), DURATION)
    return () => clearTimeout(t)
  }, [open, originRect])

  // Once the panel is in the DOM at its resting position, snap it to look like the
  // origin rect (no transition), then animate it open on the next frame.
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!mounted || !open || !originRect || !panel) return
    const finalRect = panel.getBoundingClientRect()
    const scaleX = originRect.width / finalRect.width
    const scaleY = originRect.height / finalRect.height
    const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2)
    const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2)

    panel.style.transition = 'none'
    panel.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
    panel.style.borderRadius = '9999px'
    panel.getBoundingClientRect() // flush the styles above before animating

    const raf = requestAnimationFrame(() => {
      panel.style.transition = `transform ${DURATION}ms ${EASING}, border-radius ${DURATION}ms ${EASING}`
      panel.style.transform = 'translate(0px, 0px) scale(1, 1)'
      panel.style.borderRadius = '1.5rem'
      setVisible(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mounted])

  if (!mounted || !originRect) return null

  return createPortal(
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        style={{ borderRadius: '1.5rem' }}
        className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] bottom-[calc(env(safe-area-inset-bottom)+6rem)] flex flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/30 dark:bg-slate-800 lg:inset-x-16 lg:top-16 lg:bottom-16"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-150 active:scale-90 dark:bg-slate-700 dark:text-slate-300"
          >
            ✕
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto transition-opacity duration-200 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
