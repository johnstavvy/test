import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Expense } from '../db'
import { listExpenses } from '../lib/expenses'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  Dining: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Transport: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Shopping: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  Utilities: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  Health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  Entertainment: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  Travel: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  Other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)

  useEffect(() => {
    listExpenses().then(setExpenses)
  }, [])

  const total = expenses?.reduce((sum, e) => sum + e.total, 0) ?? 0

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Total tracked</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{currency.format(total)}</h1>
      </div>

      {expenses === null && <p className="text-slate-500 dark:text-slate-400">Loading…</p>}

      {expenses !== null && expenses.length === 0 && (
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-slate-500 dark:text-slate-400">
          <div className="text-4xl">🧾</div>
          <p>No expenses yet. Tap "Scan" below to add your first receipt.</p>
        </div>
      )}

      <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
        {expenses?.map((e) => (
          <li key={e.id}>
            <Link
              to={`/expense/${e.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700 lg:hover:border-accent/40 lg:hover:shadow-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">{e.merchant}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other}`}
                  >
                    {e.category}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{e.date}</span>
                </div>
              </div>
              <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">{currency.format(e.total)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
