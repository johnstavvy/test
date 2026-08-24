import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Bill, Expense, Income } from '../db'
import { listExpenses } from '../lib/expenses'
import { daysUntilDue, dueLabel, effectiveAmount, isBillPaidThisMonth, listBills, totalMonthlyBills } from '../lib/bills'
import { listIncomes, totalMonthlyIncome } from '../lib/income'
import { currentMonthKey, currentWeekDays, dateFromIso, humanDayLabel } from '../lib/week'
import { useGrowIn } from '../lib/useGrowIn'
import { IconChevronDown, IconWallet } from '../lib/icons'
import { HeaderAction } from '../lib/headerAction'
import { ExpandingSheet } from '../lib/expandingSheet'
import Capture from './Capture'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const rowClass =
  'flex items-center justify-between gap-3 border-b border-slate-100 py-3 transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]'

function HomeHero({
  income,
  outgoing,
  discretionary,
  spent,
  daysInMonth,
  todayDayOfMonth,
}: {
  income: number
  outgoing: number
  discretionary: number
  spent: number
  daysInMonth: number
  todayDayOfMonth: number
}) {
  const { grown, settled } = useGrowIn(1250)

  if (income === 0 && outgoing === 0) {
    return (
      <Link
        to="/budget"
        className="flex items-center justify-between rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm transition-transform duration-150 active:scale-[0.98] dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-400"
      >
        <span>Add bills and income to see your monthly budget overview</span>
        <span className="ml-3 shrink-0 text-accent-text">Set up →</span>
      </Link>
    )
  }

  const durationClass = settled ? 'duration-300' : 'duration-[1250ms] ease-out'
  const remaining = discretionary - spent
  const over = discretionary > 0 && spent > discretionary
  const nearingLimit = !over && discretionary > 0 && spent / discretionary >= 0.85
  const pct = discretionary > 0 ? spent / discretionary : spent > 0 ? 1 : 0
  const widthPct = grown ? Math.min(Math.max(pct * 100, spent > 0 ? 4 : 0), 100) : 0

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-[#31343a] dark:bg-[#212327]">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
          Spending this month
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Day {todayDayOfMonth} of {daysInMonth}
        </p>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#2b2e33]">
        <div
          className={`h-full rounded-full transition-all ${durationClass} ${
            over ? 'bg-rose-500' : nearingLimit ? 'bg-amber-500' : 'bg-accent'
          }`}
          style={{ width: `${widthPct}%` }}
        />
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{currency.format(spent)}</span>{' '}
        of <span className="tabular-nums">{currency.format(Math.max(discretionary, 0))}</span> discretionary ·{' '}
        <span
          className={`tabular-nums font-medium ${over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-500'}`}
        >
          {over ? `${currency.format(Math.abs(remaining))} over` : `${currency.format(remaining)} left`}
        </span>
      </p>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-[#1e2027]">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Income{' '}
          <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{currency.format(income)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Outgoing{' '}
          <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{currency.format(outgoing)}</span>
        </span>
      </div>
    </div>
  )
}

// Bills due within a week and not yet marked paid this month — deliberately hidden
// entirely (not an empty state) when nothing needs attention, so Home stays glanceable.
function UpcomingBills({ bills }: { bills: Bill[] }) {
  const upcoming = useMemo(
    () =>
      bills
        .filter((b) => !isBillPaidThisMonth(b))
        .map((b) => ({ bill: b, days: daysUntilDue(b.dueDay) }))
        .filter((x) => x.days <= 7)
        .sort((a, b) => a.days - b.days)
        .slice(0, 4),
    [bills],
  )

  if (upcoming.length === 0) return null

  return (
    <Link
      to="/budget"
      className="flex flex-col gap-1 rounded-3xl px-1 py-1 transition-transform duration-150 active:scale-[0.98] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
          <IconWallet className="h-3.5 w-3.5" />
          Upcoming Bills
        </p>
        <span className="text-xs text-accent-text">View all →</span>
      </div>
      <div className="flex flex-col px-3">
        {upcoming.map(({ bill, days }, i) => {
          const soon = days <= 3
          return (
            <div
              key={bill.id}
              className={`flex items-center justify-between gap-3 py-2 ${i < upcoming.length - 1 ? 'border-b border-slate-100 dark:border-[#1e2027]' : ''}`}
            >
              <div className="flex min-w-0 flex-col">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
                <span
                  className={`text-xs ${soon ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  {dueLabel(days, bill.dueDay)}
                </span>
              </div>
              <p className="tabular-nums shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                {currency.format(effectiveAmount(bill))}
              </p>
            </div>
          )
        })}
      </div>
    </Link>
  )
}

function shortLabel(iso: string) {
  return dateFromIso(iso).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
}

function longLabel(iso: string) {
  return dateFromIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [incomes, setIncomes] = useState<Income[] | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [recentOpen, setRecentOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const barGrow = useGrowIn(1250)

  function reload() {
    listExpenses().then(setExpenses)
    listBills().then(setBills)
    listIncomes().then(setIncomes)
  }

  useEffect(reload, [])

  // Reads the rect from whichever trigger was actually clicked (the mobile header
  // button and the desktop inline button are both mounted at once, CSS-hidden per
  // breakpoint) rather than a single shared ref, so the sheet's FLIP animation
  // always grows out of the trigger the user can actually see.
  function openAddExpense(e: React.MouseEvent<HTMLButtonElement>) {
    setOriginRect(e.currentTarget.getBoundingClientRect())
    setSheetOpen(true)
  }

  function handleExpenseSaved() {
    reload()
    setSheetOpen(false)
  }

  const days = useMemo(currentWeekDays, [])

  const monthExpensesTotal = useMemo(() => {
    const monthKey = currentMonthKey()
    return (expenses ?? []).filter((e) => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.total, 0)
  }, [expenses])

  const billsTotal = totalMonthlyBills(bills ?? [])
  const monthlyIncomeTotal = totalMonthlyIncome(incomes ?? [])
  const monthlyOutgoingTotal = billsTotal + monthExpensesTotal
  const discretionary = monthlyIncomeTotal - billsTotal

  const daysInMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }, [])
  const todayDayOfMonth = useMemo(() => new Date().getDate(), [])

  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const day of days) totals[day] = 0
    for (const e of expenses ?? []) {
      if (e.date in totals) totals[e.date] += e.total
    }
    return totals
  }, [expenses, days])

  const weekTotal = days.reduce((sum, day) => sum + dailyTotals[day], 0)
  const maxValue = Math.max(...days.map((d) => dailyTotals[d]), 1)
  const recent = useMemo(() => expenses?.slice(0, 5) ?? [], [expenses])

  const recentGroups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of recent) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return [...map.entries()]
  }, [recent])

  const q = query.trim().toLowerCase()
  const isSearching = q !== ''

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    return (expenses ?? []).filter((e) => e.merchant.toLowerCase().includes(q))
  }, [expenses, q, isSearching])

  const searchGroups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of searchResults) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return [...map.entries()]
  }, [searchResults])

  return (
    <div className="flex flex-col lg:gap-6 lg:px-4 lg:pt-6">
      <HeaderAction>
        <button
          onClick={openAddExpense}
          className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95"
        >
          Add
        </button>
      </HeaderAction>

      <ExpandingSheet open={sheetOpen} originRect={originRect} onClose={() => setSheetOpen(false)} title="Add Expense">
        <Capture onSaved={handleExpenseSaved} />
      </ExpandingSheet>

      <div className="hidden items-center justify-between lg:flex">
        <h1 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">Home</h1>
        <button
          onClick={openAddExpense}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95"
        >
          Add
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4 lg:px-0 lg:pt-0">
        <HomeHero
          income={monthlyIncomeTotal}
          outgoing={monthlyOutgoingTotal}
          discretionary={discretionary}
          spent={monthExpensesTotal}
          daysInMonth={daysInMonth}
          todayDayOfMonth={todayDayOfMonth}
        />

        {bills !== null && <UpcomingBills bills={bills} />}

        {expenses !== null && expenses.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant…"
            className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
          />
        )}
      </div>

      {isSearching ? (
        <div className="flex flex-col px-4 pb-6 lg:px-0">
          {searchResults.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No expenses match "{query.trim()}".
            </p>
          )}
          {searchGroups.map(([date, items]) => (
            <div key={date} className="flex flex-col">
              <p className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {humanDayLabel(date)}
              </p>
              {items.map((e) => (
                <Link key={e.id} to={`/expense/${e.id}`} className={rowClass}>
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{e.merchant}</p>
                  <p className="tabular-nums ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                    {currency.format(e.total)}
                  </p>
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
      <section
        className="flex flex-col gap-3 px-4 pb-5 pt-6 min-h-[25dvh] lg:min-h-[320px] lg:flex-1 lg:px-0 lg:pb-0 lg:pt-0"
      >
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">This week</p>
          <h1 className="tabular-nums text-[42px] font-medium leading-none tracking-[-0.03em] text-slate-900 dark:text-slate-100">
            {currency.format(weekTotal)}
          </h1>
        </div>

        <p className="h-4 text-sm font-medium text-accent-text">
          {selectedDay && `${longLabel(selectedDay)} · ${currency.format(dailyTotals[selectedDay])}`}
        </p>

        <div className="flex flex-1 items-end justify-between gap-2 border-b border-slate-200 pb-0 dark:border-[#31343a]">
          {days.map((iso) => {
            const value = dailyTotals[iso]
            const heightPct = barGrow.grown ? (value > 0 ? Math.max((value / maxValue) * 100, 4) : 0) : 0
            const isSelected = selectedDay === iso
            const isZero = value === 0
            return (
              <button
                key={iso}
                onClick={() => setSelectedDay((prev) => (prev === iso ? null : iso))}
                aria-label={`${longLabel(iso)}: ${currency.format(value)}`}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="flex h-16 w-full items-end justify-center lg:h-32">
                  <div
                    className={`min-h-1.5 w-full max-w-[24px] rounded-t-lg rounded-b-[4px] transition-all lg:max-w-[32px] ${
                      isZero ? 'bg-slate-200 dark:bg-[#2a2d34]' : 'bg-accent'
                    } ${barGrow.settled ? 'duration-200' : 'duration-[1250ms] ease-out'} ${
                      isSelected
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#17181b]'
                        : ''
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`text-xs transition-colors ${
                    isSelected ? 'font-semibold text-accent' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {shortLabel(iso)}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col px-4 pb-6 lg:w-96 lg:shrink-0 lg:px-0 lg:pb-0">
        <button
          onClick={() => setRecentOpen((open) => !open)}
          aria-expanded={recentOpen}
          className="flex items-center justify-between border-b border-slate-100 py-3 transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
        >
          <span className="font-medium text-slate-900 dark:text-slate-100">Recent Expenses</span>
          <IconChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${recentOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {recentOpen && (
          <div className="flex flex-col">
            {expenses === null && <p className="px-1 py-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

            {expenses !== null && recent.length === 0 && (
              <p className="px-1 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No expenses yet. Tap "Scan" below to add your first receipt.
              </p>
            )}

            {recentGroups.map(([date, items]) => (
              <div key={date} className="flex flex-col">
                <p className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                  {humanDayLabel(date)}
                </p>
                {items.map((e) => (
                  <Link key={e.id} to={`/expense/${e.id}`} className={rowClass}>
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{e.merchant}</p>
                    <p className="tabular-nums ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                      {currency.format(e.total)}
                    </p>
                  </Link>
                ))}
              </div>
            ))}

            {expenses !== null && expenses.length > recent.length && (
              <Link to="/expenses" className="py-3 text-center text-sm font-medium text-accent-text">
                View all expenses
              </Link>
            )}
          </div>
        )}
      </section>
      </div>
      )}
    </div>
  )
}
