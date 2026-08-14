import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import logo from './assets/logo.png'
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

function BottomBarItem({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  return (
    <NavLink
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
          <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
            {item.icon}
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

function SidebarItem({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:hover:bg-slate-100 dark:lg:hover:bg-slate-800 ${
          isActive ? 'bg-accent/10 text-accent dark:bg-accent/15' : 'text-slate-500 dark:text-slate-400'
        }`
      }
    >
      <span className="text-lg">{item.icon}</span>
      {item.label}
    </NavLink>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 dark:bg-slate-900 lg:mx-0 lg:max-w-none lg:flex-row">
      <aside className="hidden lg:sticky lg:top-4 lg:m-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:rounded-3xl lg:border lg:border-white/60 lg:bg-white/70 lg:p-4 lg:shadow-lg lg:shadow-slate-900/10 lg:backdrop-blur-xl dark:lg:border-white/10 dark:lg:bg-slate-900/70 dark:lg:shadow-black/40">
        <div className="flex items-center gap-2 px-3 pb-4 pt-1">
          <img src={logo} alt="" className="h-7 w-7 rounded-lg" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Pecunia</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.to} item={item} />
        ))}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:min-h-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-center gap-2 border-b border-slate-200/80 bg-white/80 py-3 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80 lg:hidden"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
        >
          <img src={logo} alt="" className="h-6 w-6 rounded-md" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Pecunia</span>
        </header>

        <main className="flex-1 pb-32 lg:mx-auto lg:w-full lg:max-w-5xl lg:pb-10">
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
          className="fixed inset-x-4 z-40 mx-auto max-w-md rounded-full border border-white/60 bg-white/70 shadow-lg shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/40 lg:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="flex justify-around px-1 py-1.5">
            {NAV_ITEMS.map((item) => (
              <BottomBarItem key={item.to} item={item} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
