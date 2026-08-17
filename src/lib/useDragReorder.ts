import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'

const DRAG_THRESHOLD = 8

// Pointer-based drag-to-reorder for a flex list. Items stay mounted at their
// original DOM position and are visually reordered via CSS `order` (see
// orderIndex in the consumer) — dragging only ever mutates `order`, never
// the DOM, so refs/keys stay stable mid-drag.
export function useDragReorder(order: string[], setOrder: (order: string[]) => void, axis: 'x' | 'y') {
  const itemRefs = useRef(new Map<string, HTMLElement>())
  const orderRef = useRef(order)
  orderRef.current = order

  const dragKeyRef = useRef<string | null>(null)
  const startPosRef = useRef(0)
  // The dragged item's rect at drag-start, before any transform is applied —
  // used to compute where the pointer *wants* the item's center to be.
  const startRectRef = useRef<DOMRect | null>(null)
  // Each flex slot's geometric center (0..n-1), captured once at drag-start.
  // Slot geometry doesn't change as `order` gets reassigned mid-drag (items
  // are equal-sized), so this stays valid for the whole gesture — it's what
  // lets us compute the transform relative to the item's *current* slot
  // instead of its original one, which is what keeps the icon glued to the
  // pointer through every reorder instead of drifting off by a slot-width
  // each time it swaps past a neighbor.
  const slotCentersRef = useRef<number[]>([])
  const activeRef = useRef(false)
  const wasDraggingRef = useRef(false)

  const [dragState, setDragState] = useState<{ key: string; offset: number } | null>(null)

  function registerItemRef(key: string, el: HTMLElement | null) {
    if (el) itemRefs.current.set(key, el)
    else itemRefs.current.delete(key)
  }

  function measureCenter(el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    return axis === 'x' ? rect.left + rect.width / 2 : rect.top + rect.height / 2
  }

  function handlePointerDown(key: string, e: ReactPointerEvent) {
    if (e.button !== 0) return
    // Stops iOS Safari from starting its native "drag this link out" gesture
    // or text-selection instead of delivering pointermove events to us.
    e.preventDefault()
    dragKeyRef.current = key
    startPosRef.current = axis === 'x' ? e.clientX : e.clientY
    startRectRef.current = itemRefs.current.get(key)?.getBoundingClientRect() ?? null
    slotCentersRef.current = orderRef.current.map((k) => {
      const el = itemRefs.current.get(k)
      return el ? measureCenter(el) : 0
    })
    activeRef.current = false
  }

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      const key = dragKeyRef.current
      const startRect = startRectRef.current
      if (!key || !startRect) return
      const pos = axis === 'x' ? e.clientX : e.clientY
      const rawOffset = pos - startPosRef.current

      if (!activeRef.current) {
        if (Math.abs(rawOffset) < DRAG_THRESHOLD) return
        activeRef.current = true
        wasDraggingRef.current = true
      }

      // Where the pointer wants this item's center to be, continuously —
      // independent of how many times it's swapped slots so far.
      const desiredCenter =
        axis === 'x'
          ? startRect.left + startRect.width / 2 + rawOffset
          : startRect.top + startRect.height / 2 + rawOffset

      const currentOrder = orderRef.current
      let draggedIndex = currentOrder.indexOf(key)

      for (let i = 0; i < currentOrder.length; i++) {
        if (i === draggedIndex) continue
        const siblingEl = itemRefs.current.get(currentOrder[i])
        if (!siblingEl) continue
        const center = measureCenter(siblingEl)

        const shouldMoveBefore = i < draggedIndex && desiredCenter < center
        const shouldMoveAfter = i > draggedIndex && desiredCenter > center
        if (shouldMoveBefore || shouldMoveAfter) {
          const next = [...currentOrder]
          next.splice(draggedIndex, 1)
          next.splice(i, 0, key)
          setOrder(next)
          draggedIndex = i
          break
        }
      }

      // Transform relative to the item's *current* slot (post any swap just
      // above), not its original one — this is the piece that keeps it tight
      // to the pointer instead of drifting by a slot-width per reorder.
      const slotCenter = slotCentersRef.current[draggedIndex] ?? desiredCenter
      setDragState({ key, offset: desiredCenter - slotCenter })
    }

    function handleUp() {
      dragKeyRef.current = null
      startRectRef.current = null
      activeRef.current = false
      setDragState(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [axis, setOrder])

  // A real drag (past the threshold) shouldn't also fire the link's navigation.
  function handleClickCapture(e: ReactMouseEvent) {
    if (wasDraggingRef.current) {
      e.preventDefault()
      e.stopPropagation()
      wasDraggingRef.current = false
    }
  }

  return { registerItemRef, handlePointerDown, handleClickCapture, dragState }
}
