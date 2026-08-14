import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Capture from './pages/Capture'
import Summary from './pages/Summary'
import ExpenseDetail from './pages/ExpenseDetail'

const NAV_ITEMS = [
  { to: '/', label: 'Expenses', icon: '📋', end: true },
  { to: '/capture', label: 'Scan', icon: '🧾', end: false },
  { to: '/summary', label: 'Summary', icon: '📊', end: false },
]

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capture" element={<Capture />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/expense/:id" element={<ExpenseDetail />} />
        </Routes>
      </main>

      <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex justify-around py-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 text-xs font-medium ${
                  isActive ? 'text-emerald-600' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
