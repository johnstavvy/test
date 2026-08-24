import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export interface ToastOptions {
  message: string
  actionLabel?: string
  onAction?: () => void
  duration?: number // ms, default 5000
}

interface ToastState extends ToastOptions {
  id: number
}

const ToastContext = createContext<{ show: (opts: ToastOptions) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idRef = useRef(0)

  const show = useCallback((opts: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = ++idRef.current
    setToast({ ...opts, id })
    timerRef.current = setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev))
    }, opts.duration ?? 5000)
  }, [])

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed inset-x-4 z-50 mx-auto flex max-w-sm animate-toast-in items-center justify-between gap-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-lg shadow-black/30 backdrop-blur-xl bottom-[calc(env(safe-area-inset-bottom)+6rem)] lg:bottom-8 dark:border-white/10 dark:bg-[#212327]/95"
        >
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.actionLabel && (
            <button
              onClick={() => {
                toast.onAction?.()
                dismiss()
              }}
              className="shrink-0 font-semibold text-accent"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
