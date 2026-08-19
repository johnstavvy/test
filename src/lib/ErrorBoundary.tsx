import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Class component is required here — React only lets error boundaries be
// implemented via getDerivedStateFromError/componentDidCatch, no hook equivalent.
// Without this, any uncaught render error white-screens the whole app (this project
// has already shipped one such crash — see 970214f — caught by luck of testing
// timing, not by any safety net).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl dark:bg-rose-900/30">
            ⚠️
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h1>
            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              The app hit an unexpected error. Your data is safe on this device — try reloading.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                window.location.href = import.meta.env.BASE_URL
              }}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-transform duration-150 active:scale-[0.97] active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:active:bg-slate-800"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
