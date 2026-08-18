import { useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'

const DRAG_THRESHOLD = 8

// Horizontal swipe-left-to-reveal-action(s) for a single list row. Local to
// each row (not a shared registry like useDragReorder) since only one row's
// gesture is ever in flight and rows don't need to coordinate positions.
// `revealWidth` is the total px of action buttons behind the row (default
// fits one action button; pass e.g. 160 for two side-by-side).
export function useSwipeToDelete(revealWidth = 84) {
  const OPEN_OFFSET = -revealWidth
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startOffsetRef = useRef(0)
  const activeRef = useRef(false)
  const pastThresholdRef = useRef(false)
  const wasDraggingRef = useRef(false)

  function clamp(v: number) {
    return Math.min(0, Math.max(OPEN_OFFSET, v))
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    startXRef.current = e.clientX
    startOffsetRef.current = offset
    activeRef.current = true
    pastThresholdRef.current = false
    setIsDragging(true)
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!activeRef.current) return
    const dx = e.clientX - startXRef.current
    if (!pastThresholdRef.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      pastThresholdRef.current = true
      wasDraggingRef.current = true
    }
    setOffset(clamp(startOffsetRef.current + dx))
  }

  function endDrag() {
    if (!activeRef.current) return
    activeRef.current = false
    setIsDragging(false)
    setOffset((prev) => (prev < OPEN_OFFSET / 2 ? OPEN_OFFSET : 0))
  }

  function close() {
    setOffset(0)
  }

  // A real swipe shouldn't also fire the row's own click/navigation.
  function handleClickCapture(e: ReactMouseEvent) {
    if (wasDraggingRef.current) {
      e.preventDefault()
      e.stopPropagation()
      wasDraggingRef.current = false
    }
  }

  return {
    offset,
    isDragging,
    isOpen: offset === OPEN_OFFSET,
    close,
    handleClickCapture,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  }
}
