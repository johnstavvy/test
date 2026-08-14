import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Expenses from './pages/Expenses'
import Capture from './pages/Capture'
import Summary from './pages/Summary'
import ExpenseDetail from './pages/ExpenseDetail'
import Settings from './pages/Settings'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/expenses', label: 'Expenses', icon: '📋', end: false },
  { to: '/capture', label: 'Scan', icon: '🧾', end: false },
  { to: '/summary', label: 'Summary', icon: '📊', end: false },
  { to: '/settings', label: 'Settings', icon: '⚙️', end: false },
]

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 dark:bg-slate-900">
      <header
        className="sticky top-0 z-20 flex items-center border-b border-slate-200 bg-white/95 px-2 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-12 w-12 flex-col items-center justify-center gap-1"
        >
          <span className="h-0.5 w-6 rounded bg-slate-700 dark:bg-slate-200" />
          <span className="h-0.5 w-6 rounded bg-slate-700 dark:bg-slate-200" />
          <span className="h-0.5 w-6 rounded bg-slate-700 dark:bg-slate-200" />
        </button>
        <span className="ml-1 font-semibold text-slate-900 dark:text-slate-100">Expense Scanner</span>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/expense/:id" element={<ExpenseDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <nav
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col gap-1 border-r border-slate-200 bg-white p-3 shadow-xl transition-transform dark:border-slate-700 dark:bg-slate-800 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
