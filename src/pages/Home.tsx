import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Bill, Expense, Income } from '../db'
import { listExpenses } from '../lib/expenses'
import { listBills, totalMonthlyBills } from '../lib/bills'
import { listIncomes, totalMonthlyIncome } from '../lib/income'
import { currentMonthKey, currentWeekDays, dateFromIso, isoDate } from '../lib/week'
import { useGrowIn } from '../lib/useGrowIn'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function SpendingTrend({
  income,
  outgoing,
  discretionary,
  cumulativeSpend,
  daysInMonth,
  todayDayOfMonth,
}: {
  income: number
  outgoing: number
  discretionary: number
  cumulativeSpend: number[]
  daysInMonth: number
  todayDayOfMonth: number
}) {
  const gradientId = useId()
  const { grown, settled } = useGrowIn(700)

  if (income === 0 && outgoing === 0) {
    return (
      <Link
        to="/budget"
        className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm transition-transform duration-150 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
      >
        <span>Add bills and income to see your monthly budget overview</span>
        <span className="ml-3 shrink-0 text-accent">Set up →</span>
      </Link>
    )
  }

  const net = income - outgoing
  const durationClass = settled ? 'duration-300' : 'duration-700 ease-out'
  const areaGradientId = `${gradientId}-area`
  const lineGradientId = `${gradientId}-line`
  const revealClipId = `${gradientId}-reveal`

  const width = 280
  const height = 84
  const spentSoFar = cumulativeSpend[todayDayOfMonth - 1] ?? 0
  const maxY = Math.max(discretionary, spentSoFar, 1) * 1.15
  const xAt = (day: number) => (daysInMonth > 1 ? ((day - 1) / (daysInMonth - 1)) * width : 0)
  const yAt = (value: number) => height - (value / maxY) * height

  const points = cumulativeSpend.slice(0, todayDayOfMonth).map((value, i) => [xAt(i + 1), yAt(value)])
  const hasLine = points.length >= 2
  const linePath = hasLine ? points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') : ''
  const areaPath = hasLine
    ? `M${points[0][0]},${height} ${points.map((p) => `L${p[0]},${p[1]}`).join(' ')} L${points[points.length - 1][0]},${height} Z`
    : ''
  const budgetY = yAt(discretionary)
  const lastPoint = points[points.length - 1]

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Spending this month
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Day {todayDayOfMonth} of {daysInMonth}
        </p>
      </div>

      <div className="relative h-20 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#33ccb3" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#33ccb3" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={lineGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#026e5c" />
          </linearGradient>
          <clipPath id={revealClipId}>
            <rect
              x="0"
              y="0"
              height={height}
              width={grown ? width : 0}
              className={`transition-all ${durationClass}`}
            />
          </clipPath>
        </defs>

        {discretionary > 0 && discretionary <= maxY && (
          <line
            x1="0"
            y1={budgetY}
            x2={width}
            y2={budgetY}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="text-slate-300 dark:text-slate-600"
          />
        )}

        <g clipPath={`url(#${revealClipId})`}>
          {hasLine && <path d={areaPath} fill={`url(#${areaGradientId})`} />}
          {hasLine && (
            <path d={linePath} fill="none" stroke={`url(#${lineGradientId})`} strokeWidth="2.5" strokeLinecap="round" />
          )}
        </g>
      </svg>
      {lastPoint && (
        <div
          className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#026e5c] shadow-sm transition-opacity dark:border-slate-800 ${durationClass} ${
            grown ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ left: `${(lastPoint[0] / width) * 100}%`, top: `${(lastPoint[1] / height) * 100}%` }}
        />
      )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Income <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{currency.format(income)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Outgoing <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{currency.format(outgoing)}</span>
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-sm dark:border-slate-700">
        <span className="text-slate-600 dark:text-slate-300">Net</span>
        <span
          className={`font-semibold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
        >
          {net >= 0 ? '+' : ''}
          {currency.format(net)}
        </span>
      </div>
    </div>
  )
}

function shortLabel(iso: string) {
  return dateFromIso(iso).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
}

function longLabel(iso: string) {
  return dateFromIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function dayLabel(iso: string, todayIso: string, yesterdayIso: string) {
  if (iso === todayIso) return 'Today'
  if (iso === yesterdayIso) return 'Yesterday'
  return dateFromIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [incomes, setIncomes] = useState<Income[] | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [recentOpen, setRecentOpen] = useState(false)
  const [query, setQuery] = useState('')
  const barGrow = useGrowIn(700)

  useEffect(() => {
    listExpenses().then(setExpenses)
    listBills().then(setBills)
    listIncomes().then(setIncomes)
  }, [])

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

  const cumulativeSpend = useMemo(() => {
    const monthKey = currentMonthKey()
    const byDay = Array(daysInMonth + 1).fill(0)
    for (const e of expenses ?? []) {
      if (!e.date.startsWith(monthKey)) continue
      const day = Number(e.date.slice(8, 10))
      if (day >= 1 && day <= daysInMonth) byDay[day] += e.total
    }
    const cumulative: number[] = []
    let running = 0
    for (let d = 1; d <= daysInMonth; d++) {
      running += byDay[d]
      cumulative.push(running)
    }
    return cumulative
  }, [expenses, daysInMonth])

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
  const recent = expenses?.slice(0, 5) ?? []

  const recentGroups = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of recent) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return [...map.entries()]
  }, [recent])

  const todayIso = useMemo(() => isoDate(new Date()), [])
  const yesterdayIso = useMemo(() => {
    const t = dateFromIso(todayIso)
    return isoDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1))
  }, [todayIso])

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
      <div className="flex flex-col gap-3 px-4 pt-4 lg:px-0 lg:pt-0">
        <SpendingTrend
          income={monthlyIncomeTotal}
          outgoing={monthlyOutgoingTotal}
          discretionary={discretionary}
          cumulativeSpend={cumulativeSpend}
          daysInMonth={daysInMonth}
          todayDayOfMonth={todayDayOfMonth}
        />

        {expenses !== null && expenses.length > 0 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant…"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        )}
      </div>

      {isSearching ? (
        <div className="flex flex-col gap-2 px-4 pb-6 lg:px-0">
          {searchResults.length === 0 && (
            <p className="px-1 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No expenses match "{query.trim()}".
            </p>
          )}
          {searchGroups.map(([date, items]) => (
            <div key={date} className="flex flex-col gap-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {dayLabel(date, todayIso, yesterdayIso)}
              </p>
              {items.map((e) => (
                <Link
                  key={e.id}
                  to={`/expense/${e.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700 lg:hover:border-accent/40 lg:hover:shadow-md"
                >
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{e.merchant}</p>
                  <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
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
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{currency.format(weekTotal)}</h1>
        </div>

        <p className="h-4 text-sm font-medium text-accent">
          {selectedDay && `${longLabel(selectedDay)} · ${currency.format(dailyTotals[selectedDay])}`}
        </p>

        <div className="flex flex-1 items-end justify-between gap-2 border-b border-slate-200 pb-0 dark:border-slate-700">
          {days.map((iso) => {
            const value = dailyTotals[iso]
            const heightPct = barGrow.grown ? Math.max((value / maxValue) * 100, value > 0 ? 8 : 3) : 0
            const isSelected = selectedDay === iso
            return (
              <button
                key={iso}
                onClick={() => setSelectedDay((prev) => (prev === iso ? null : iso))}
                aria-label={`${longLabel(iso)}: ${currency.format(value)}`}
                className="flex h-24 flex-1 flex-col items-center justify-end gap-1.5 lg:h-40"
              >
                <div
                  className={`w-full max-w-[24px] rounded-t bg-accent transition-all lg:max-w-[32px] ${
                    barGrow.settled ? 'duration-200' : 'duration-700 ease-out'
                  } ${
                    isSelected
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900'
                      : ''
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
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

      <section className="flex flex-col gap-2 px-4 pb-6 lg:w-96 lg:shrink-0 lg:px-0 lg:pb-0">
        <button
          onClick={() => setRecentOpen((open) => !open)}
          aria-expanded={recentOpen}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-transform duration-150 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800"
        >
          <span className="font-medium text-slate-900 dark:text-slate-100">Recent Expenses</span>
          <span
            className={`text-slate-400 transition-transform dark:text-slate-500 ${recentOpen ? 'rotate-180' : ''}`}
          >
            ⌄
          </span>
        </button>

        {recentOpen && (
          <div className="flex flex-col gap-2">
            {expenses === null && <p className="px-1 py-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}

            {expenses !== null && recent.length === 0 && (
              <p className="px-1 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                No expenses yet. Tap "Scan" below to add your first receipt.
              </p>
            )}

            {recentGroups.map(([date, items]) => (
              <div key={date} className="flex flex-col gap-2">
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {dayLabel(date, todayIso, yesterdayIso)}
                </p>
                {items.map((e) => (
                  <Link
                    key={e.id}
                    to={`/expense/${e.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700 lg:hover:border-accent/40 lg:hover:shadow-md"
                  >
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{e.merchant}</p>
                    <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                      {currency.format(e.total)}
                    </p>
                  </Link>
                ))}
              </div>
            ))}

            {expenses !== null && expenses.length > recent.length && (
              <Link to="/expenses" className="py-2 text-center text-sm font-medium text-accent">
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
