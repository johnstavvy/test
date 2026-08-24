import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<{ confirm: (opts: ConfirmOptions) => Promise<boolean> } | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setState({ ...opts, resolve })
    })
  }, [])

  function settle(value: boolean) {
    resolveRef.current?.(value)
    resolveRef.current = null
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm lg:items-center">
          <div
            className="w-full max-w-sm animate-toast-in rounded-t-3xl border border-white/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#212327] lg:mb-0 lg:rounded-3xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{state.title}</h2>
            {state.message && (
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{state.message}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => settle(false)}
                className="flex-1 rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-600 transition-transform duration-150 active:scale-[0.97] dark:border-[#3a3e45] dark:text-slate-300"
              >
                {state.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => settle(true)}
                className={`flex-1 rounded-full px-4 py-3 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] ${
                  state.destructive ? 'bg-rose-600 active:opacity-90' : 'bg-accent active:opacity-90'
                }`}
              >
                {state.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx.confirm
}
