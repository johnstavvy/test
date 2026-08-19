import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type ResolvedTheme = 'light' | 'dark'
export type ThemeMode = ResolvedTheme | 'system'

const STORAGE_KEY = 'expense-tracker-theme'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

// Plain (non-hook) accessors for backup export/import, which run outside React.
export function getStoredTheme(): ThemeMode {
  return getStoredMode()
}

export function setStoredTheme(mode: unknown) {
  if (mode === 'light' || mode === 'dark' || mode === 'system') localStorage.setItem(STORAGE_KEY, mode)
}

const ThemeContext = createContext<{ theme: ResolvedTheme; mode: ThemeMode; setTheme: (mode: ThemeMode) => void } | null>(
  null,
)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  // Only relevant while mode === 'system', but cheap enough to always listen —
  // keeps the app in sync live if the OS theme changes while it's open.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const theme: ResolvedTheme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  return <ThemeContext.Provider value={{ theme, mode, setTheme: setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
