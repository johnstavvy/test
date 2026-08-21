import { useRef, useState } from 'react'
import type { CropRect } from './image'
import { IconCheck, IconClose } from './icons'

const MIN_SIZE = 0.08
// Default rect leaves a small margin instead of the full frame — most receipt
// photos have some background around the paper, so starting already-inset means
// a well-framed photo often needs zero adjustment before confirming.
const DEFAULT_RECT: CropRect = { x: 0.04, y: 0.04, w: 0.92, h: 0.92 }

type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'move'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function ReceiptCropper({
  imageDataUrl,
  onConfirm,
  onCancel,
}: {
  imageDataUrl: string
  onConfirm: (rect: CropRect) => void
  onCancel: () => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<CropRect>(DEFAULT_RECT)
  const dragRef = useRef<{ handle: Handle; startRect: CropRect; startX: number; startY: number } | null>(null)

  function beginDrag(handle: Handle) {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      dragRef.current = { handle, startRect: rect, startX: e.clientX, startY: e.clientY }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
  }

  function onMove(e: PointerEvent) {
    const drag = dragRef.current
    const frame = frameRef.current
    if (!drag || !frame) return
    // Re-measure on every move (not cached) so this stays correct regardless of
    // any ancestor animation/transform in progress — see the nav-pill bug fix in
    // useActivePill.ts for why a cached/reused rect measurement is unsafe here.
    const frameRect = frame.getBoundingClientRect()
    const dx = (e.clientX - drag.startX) / frameRect.width
    const dy = (e.clientY - drag.startY) / frameRect.height
    const { startRect } = drag
    let next = { ...startRect }

    if (drag.handle === 'move') {
      next.x = clamp(startRect.x + dx, 0, 1 - startRect.w)
      next.y = clamp(startRect.y + dy, 0, 1 - startRect.h)
    } else {
      const left = drag.handle === 'nw' || drag.handle === 'sw'
      const top = drag.handle === 'nw' || drag.handle === 'ne'
      if (left) {
        const newX = clamp(startRect.x + dx, 0, startRect.x + startRect.w - MIN_SIZE)
        next.x = newX
        next.w = startRect.x + startRect.w - newX
      } else {
        next.w = clamp(startRect.w + dx, MIN_SIZE, 1 - startRect.x)
      }
      if (top) {
        const newY = clamp(startRect.y + dy, 0, startRect.y + startRect.h - MIN_SIZE)
        next.y = newY
        next.h = startRect.y + startRect.h - newY
      } else {
        next.h = clamp(startRect.h + dy, MIN_SIZE, 1 - startRect.y)
      }
    }
    setRect(next)
  }

  function onUp() {
    dragRef.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  const handleStyle = 'absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-accent shadow-md'

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Adjust crop</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drag the corners so just the receipt is inside the box — this helps us read it accurately.
        </p>
      </div>

      <div ref={frameRef} className="relative w-full max-w-sm select-none" style={{ touchAction: 'none' }}>
        <img src={imageDataUrl} alt="Receipt to crop" className="block w-full rounded-2xl" draggable={false} />

        {/* dimmed regions outside the crop rect */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl">
          <div className="absolute inset-x-0 top-0 bg-black/50" style={{ height: `${rect.y * 100}%` }} />
          <div className="absolute inset-x-0 bottom-0 bg-black/50" style={{ height: `${(1 - rect.y - rect.h) * 100}%` }} />
          <div
            className="absolute bg-black/50"
            style={{ top: `${rect.y * 100}%`, height: `${rect.h * 100}%`, left: 0, width: `${rect.x * 100}%` }}
          />
          <div
            className="absolute bg-black/50"
            style={{
              top: `${rect.y * 100}%`,
              height: `${rect.h * 100}%`,
              right: 0,
              width: `${(1 - rect.x - rect.w) * 100}%`,
            }}
          />
        </div>

        <div
          onPointerDown={beginDrag('move')}
          className="absolute touch-none border-2 border-white"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
          }}
        />

        <div className={handleStyle} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%` }} onPointerDown={beginDrag('nw')} />
        <div className={handleStyle} style={{ left: `${(rect.x + rect.w) * 100}%`, top: `${rect.y * 100}%` }} onPointerDown={beginDrag('ne')} />
        <div className={handleStyle} style={{ left: `${rect.x * 100}%`, top: `${(rect.y + rect.h) * 100}%` }} onPointerDown={beginDrag('sw')} />
        <div
          className={handleStyle}
          style={{ left: `${(rect.x + rect.w) * 100}%`, top: `${(rect.y + rect.h) * 100}%` }}
          onPointerDown={beginDrag('se')}
        />
      </div>

      <div className="mt-2 flex w-full max-w-sm gap-3">
        <button
          onClick={onCancel}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-slate-300 px-4 py-3.5 font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:active:bg-slate-800"
        >
          <IconClose className="h-4 w-4" />
          Cancel
        </button>
        <button
          onClick={() => onConfirm(rect)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-3.5 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90"
        >
          <IconCheck className="h-4 w-4" />
          Use Photo
        </button>
      </div>
    </div>
  )
}
