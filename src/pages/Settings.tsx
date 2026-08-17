import { useTheme } from '../lib/theme'
import { useNavOrder } from '../lib/navOrder'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { resetOrder } = useNavOrder()

  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:mx-auto lg:max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h1>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Dark mode</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Switch between light and dark appearance.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={theme === 'dark'}
          onClick={toggleTheme}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
            theme === 'dark' ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">Menu order</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Press and drag any tab in the menu to reorder it.
          </p>
        </div>
        <button
          onClick={resetOrder}
          className="shrink-0 rounded-full border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-transform duration-150 active:scale-95 active:bg-red-50 dark:border-red-800 dark:text-red-400 dark:active:bg-red-950"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
