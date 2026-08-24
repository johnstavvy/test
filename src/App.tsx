import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import logo from './assets/logo.png'
import Home from './pages/Home'
import Expenses from './pages/Expenses'
import Capture from './pages/Capture'
import Summary from './pages/Summary'
import ExpenseDetail from './pages/ExpenseDetail'
import Budget from './pages/Budget'
import Settings from './pages/Settings'
import { useNavOrder } from './lib/navOrder'
import { useActivePill } from './lib/useActivePill'
import { NAV_ITEMS, activeNavItem } from './lib/navItems'

function BottomBarItem({
  item,
  pillRef,
}: {
  item: (typeof NAV_ITEMS)[number]
  pillRef: (el: HTMLElement | null) => void
}) {
  return (
    <NavLink
      ref={pillRef}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `relative z-10 flex min-h-12 min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
          isActive ? 'text-accent' : 'text-slate-400 dark:text-slate-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={`h-6 w-6 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
          />
          <span className="w-full truncate text-center">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

const HEADER_TITLES: { test: (pathname: string) => boolean; title: string }[] = [
  { test: (p) => p === '/', title: 'Home' },
  { test: (p) => p.startsWith('/expenses'), title: 'Expenses' },
  { test: (p) => p.startsWith('/summary'), title: 'Summary' },
  { test: (p) => p.startsWith('/budget'), title: 'Budget' },
  { test: (p) => p.startsWith('/settings'), title: 'Settings' },
  { test: (p) => p.startsWith('/capture'), title: 'Scan Receipt' },
  { test: (p) => p.startsWith('/expense/'), title: 'Edit Expense' },
]

function headerTitle(pathname: string) {
  return HEADER_TITLES.find((h) => h.test(pathname))?.title ?? 'Pecunia'
}

// Instagram-style nav bar: shrinks while scrolling down, restores as soon as
// scrolling reverses upward (not only once back at the very top).
function useNavShrink(threshold = 16, directionDeadZone = 4) {
  const [shrunk, setShrunk] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY
        if (y <= threshold) {
          setShrunk(false)
        } else if (delta > directionDeadZone) {
          setShrunk(true)
        } else if (delta < -directionDeadZone) {
          setShrunk(false)
        }
        lastY = y
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold, directionDeadZone])

  return shrunk
}

function SidebarItem({ item }: { item: (typeof NAV_ITEMS)[number] }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:hover:bg-slate-100 dark:lg:hover:bg-[#2d3036] ${
          isActive ? 'bg-accent/10 text-accent dark:bg-accent/15' : 'text-slate-500 dark:text-slate-400'
        }`
      }
    >
      <item.icon className="h-5 w-5" />
      {item.label}
    </NavLink>
  )
}

export default function App() {
  const location = useLocation()
  const scrolled = useNavShrink()
  const { order } = useNavOrder()

  const orderedItems = order.map((to) => NAV_ITEMS.find((item) => item.to === to)!).filter(Boolean)
  const activeItem = activeNavItem(location.pathname)
  const bottomPill = useActivePill(activeItem.to, [order])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50 dark:bg-[#17181b] lg:mx-0 lg:max-w-none lg:flex-row">
      <aside className="relative hidden lg:sticky lg:top-4 lg:m-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-64 lg:shrink-0 lg:flex-col lg:gap-1 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-white/60 lg:p-4 lg:shadow-lg lg:shadow-slate-900/10 dark:lg:border-white/10 dark:lg:shadow-black/40">
        <div aria-hidden className="absolute inset-0 z-0 bg-white/70 backdrop-blur-xl dark:bg-[#1b1d20]/70" />
        <div className="relative z-10 flex items-center gap-2 px-3 pb-4 pt-1">
          <img src={logo} alt="" className="h-7 w-7 rounded-lg" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Pecunia</span>
        </div>
        <div className="relative z-10 flex flex-col gap-1">
          {orderedItems.map((item) => (
            <SidebarItem key={item.to} item={item} />
          ))}
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col lg:min-h-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-lg dark:border-[#31343a] dark:bg-[#1b1d20]/80 lg:hidden"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
        >
          <h1 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
            {headerTitle(location.pathname)}
          </h1>
          <div id="header-action" className="flex items-center gap-2" />
        </header>

        <main className="flex-1 pb-24 lg:mx-auto lg:w-full lg:max-w-5xl lg:pb-10">
          <div key={location.pathname} className="page-transition">
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/capture" element={<Capture />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/expense/:id" element={<ExpenseDetail />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        <div
          className="sticky bottom-0 z-40 px-4 lg:hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-gradient-to-b from-transparent to-slate-50 dark:to-[#17181b]"
          />
          <nav
            className={`relative mx-auto flex max-w-md items-center gap-1.5 overflow-hidden rounded-full border border-slate-900/10 p-1.5 shadow-lg shadow-slate-900/10 transition-all duration-300 ease-out dark:border-white/10 dark:shadow-black/40 ${
              scrolled ? 'translate-y-1 opacity-70' : 'translate-y-0 opacity-100'
            }`}
          >
            {/* Blur/fill lives on its own layer, separate from the overflow-hidden
                element that clips it to the pill shape — Safari's backdrop-filter
                stops rendering when it shares an element with overflow-hidden. */}
            <div aria-hidden className="absolute inset-0 z-0 bg-white/92 backdrop-blur-xl dark:bg-[#1b1d20]/92" />
            <div ref={bottomPill.containerRef} className="relative z-10 flex flex-1 justify-around">
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-y-0 z-0 rounded-full bg-accent/15 transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  bottomPill.rect ? 'opacity-100 duration-300' : 'opacity-0 duration-0'
                }`}
                style={bottomPill.rect ? { left: bottomPill.rect.start, width: bottomPill.rect.size } : undefined}
              />
              {orderedItems.map((item) => (
                <BottomBarItem key={item.to} item={item} pillRef={bottomPill.registerRef(item.to)} />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
