import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Portals a page's contextual header action (e.g. Expenses' "Scan", Budget's
// Bills/Income switch) into the slot App.tsx's sticky mobile header reserves
// for it (`#header-action`) — same portal-to-a-fixed-slot approach already
// used by ExpandingSheet, just targeting an in-page node instead of document.body.
export function HeaderAction({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setSlot(document.getElementById('header-action'))
  }, [])

  if (!slot) return null
  return createPortal(children, slot)
}
