import { useEffect, useState } from 'react'
import type { Expense } from '../db'
import { listExpenses, totalsByCategory, totalsByMonth } from '../lib/expenses'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function BarList({ rows }: { rows: { label: string; total: number }[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1)
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{r.label}</span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">{currency.format(r.total)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${Math.max((r.total / max) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Summary() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)

  useEffect(() => {
    listExpenses().then(setExpenses)
  }, [])

  if (expenses === null) {
    return <p className="px-4 py-6 text-slate-500 dark:text-slate-400">Loading…</p>
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-slate-500 dark:text-slate-400">
        <div className="text-4xl">📊</div>
        <p>Add a few expenses to see totals here.</p>
      </div>
    )
  }

  const byCategory = totalsByCategory(expenses).map((c) => ({ label: c.category, total: c.total }))
  const byMonth = totalsByMonth(expenses)
    .slice(0, 6)
    .map((m) => ({ label: monthLabel(m.month), total: m.total }))

  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          By Category
        </h2>
        <BarList rows={byCategory} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          By Month
        </h2>
        <BarList rows={byMonth} />
      </section>
    </div>
  )
}
