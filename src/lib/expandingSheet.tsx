import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

const DURATION = 320
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

function flipTransform(panel: HTMLDivElement, originRect: DOMRect) {
  const finalRect = panel.getBoundingClientRect()
  const scaleX = originRect.width / finalRect.width
  const scaleY = originRect.height / finalRect.height
  const dx = originRect.left + originRect.width / 2 - (finalRect.left + finalRect.width / 2)
  const dy = originRect.top + originRect.height / 2 - (finalRect.top + finalRect.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
}

// Renders `children` inside a rounded panel that visually grows out of `originRect`
// (typically a button's getBoundingClientRect(), captured on click) and shrinks back
// into it on close.
//
// Only `transform` and `opacity` are ever animated — both are compositor-only and
// never force a repaint. Unlike a naive version that also transitions `border-radius`
// (which forces a full repaint of the panel's entire native pixel size on every frame,
// regardless of its current on-screen scale), the pill shape and the card shape are two
// separate, non-animating layers that cross-fade via opacity, and the actual form
// content fades in only once the panel is mostly expanded — so it isn't being
// repainted while the transform is doing most of its work.
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
      panel.style.transition = `transform ${DURATION}ms ${EASING}`
      panel.style.transform = flipTransform(panel, originRect)
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

    panel.style.transition = 'none'
    panel.style.transform = flipTransform(panel, originRect)
    panel.getBoundingClientRect() // flush the styles above before animating

    const raf = requestAnimationFrame(() => {
      panel.style.transition = `transform ${DURATION}ms ${EASING}`
      panel.style.transform = 'translate(0px, 0px) scale(1, 1)'
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
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        style={{ willChange: 'transform' }}
        className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.5rem)] bottom-[calc(env(safe-area-inset-bottom)+6rem)] lg:inset-x-16 lg:top-16 lg:bottom-16"
      >
        {/* Pill-shaped layer: constant border-radius, only opacity ever animates.
            Kept a perfect complement of the card layer below (same duration, no
            delay on either) so the two always sum to full opacity — no gap where
            the panel would otherwise show through to the backdrop mid-crossfade. */}
        <div
          className={`absolute inset-0 rounded-full bg-accent transition-opacity duration-150 ${
            visible ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {/* Card-shaped layer: constant border-radius, only opacity ever animates */}
        <div
          className={`absolute inset-0 rounded-3xl bg-white shadow-2xl shadow-slate-900/30 transition-opacity duration-150 dark:bg-slate-800 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Form content: clipped to the card shape, fades in last / out first so it
            isn't being repainted while most of the transform is happening. */}
        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-3xl transition-opacity duration-150 ${
            visible ? 'opacity-100 delay-150' : 'opacity-0'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-150 active:scale-90 dark:bg-slate-700 dark:text-slate-300"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-slate-800">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
