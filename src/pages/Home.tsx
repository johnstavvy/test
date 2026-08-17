import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Expense } from '../db'
import { listExpenses } from '../lib/expenses'
import { currentWeekDays, dateFromIso, isoDate } from '../lib/week'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

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
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [recentOpen, setRecentOpen] = useState(true)

  useEffect(() => {
    listExpenses().then(setExpenses)
  }, [])

  const days = useMemo(currentWeekDays, [])

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

  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6 lg:px-4 lg:pt-6">
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
            const heightPct = Math.max((value / maxValue) * 100, value > 0 ? 8 : 3)
            const isSelected = selectedDay === iso
            return (
              <button
                key={iso}
                onClick={() => setSelectedDay((prev) => (prev === iso ? null : iso))}
                aria-label={`${longLabel(iso)}: ${currency.format(value)}`}
                className="flex h-24 flex-1 flex-col items-center justify-end gap-1.5 lg:h-40"
              >
                <div
                  className={`w-full max-w-[24px] rounded-t bg-accent transition-all duration-200 lg:max-w-[32px] ${
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
  )
}
