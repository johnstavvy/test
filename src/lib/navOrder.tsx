import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'expense-tracker-nav-order'

export const DEFAULT_NAV_ORDER = ['/', '/expenses', '/summary', '/budget', '/settings']

function sanitizeOrder(parsed: unknown): string[] {
  if (!Array.isArray(parsed)) return DEFAULT_NAV_ORDER
  const valid = parsed.filter((id): id is string => DEFAULT_NAV_ORDER.includes(id))
  const missing = DEFAULT_NAV_ORDER.filter((id) => !valid.includes(id))
  return [...valid, ...missing]
}

function readStoredOrder(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_NAV_ORDER
    return sanitizeOrder(JSON.parse(stored))
  } catch {
    return DEFAULT_NAV_ORDER
  }
}

// Plain (non-hook) accessors for backup export/import, which run outside React.
export function getStoredNavOrder(): string[] {
  return readStoredOrder()
}

export function setStoredNavOrder(order: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeOrder(order)))
}

const NavOrderContext = createContext<{
  order: string[]
  setOrder: (order: string[]) => void
  resetOrder: () => void
} | null>(null)

export function NavOrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<string[]>(readStoredOrder)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
  }, [order])

  return (
    <NavOrderContext.Provider value={{ order, setOrder, resetOrder: () => setOrder(DEFAULT_NAV_ORDER) }}>
      {children}
    </NavOrderContext.Provider>
  )
}

export function useNavOrder() {
  const ctx = useContext(NavOrderContext)
  if (!ctx) throw new Error('useNavOrder must be used within a NavOrderProvider')
  return ctx
}
