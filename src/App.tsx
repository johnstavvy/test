import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
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
  const location = useLocation()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 dark:bg-slate-900">
      <header
        className="sticky top-0 z-20 flex items-center justify-center border-b border-slate-200/80 bg-white/80 py-3 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
      >
        <span className="font-semibold text-slate-900 dark:text-slate-100">Expense Scanner</span>
      </header>

      <main className="flex-1 pb-24">
        <div key={location.pathname} className="page-transition">
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/expense/:id" element={<ExpenseDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200/80 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/85"
      >
        <div className="flex justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-slate-400 dark:text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
