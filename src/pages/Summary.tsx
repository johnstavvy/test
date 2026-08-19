import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import type { Bill, Expense, Income } from '../db'
import { listExpenses, totalsByCategory, totalsByMonth } from '../lib/expenses'
import { listBills, totalMonthlyBills } from '../lib/bills'
import { listIncomes, totalMonthlyIncome } from '../lib/income'
import { currentMonthKey } from '../lib/week'
import { useGrowIn } from '../lib/useGrowIn'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function MonthlyBudget({ income, bills, spent }: { income: number; bills: number; spent: number }) {
  const { grown, settled } = useGrowIn(1250)

  if (income === 0 && bills === 0) {
    return (
      <Link
        to="/budget"
        className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm transition-transform duration-150 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
      >
        <span>Add bills and income to compare spending against your budget</span>
        <span className="ml-3 shrink-0 text-accent">Set up →</span>
      </Link>
    )
  }

  const discretionary = income - bills
  const pct = discretionary > 0 ? spent / discretionary : spent > 0 ? 1 : 0
  const over = spent > discretionary
  const nearingLimit = !over && pct >= 0.85
  const remaining = discretionary - spent
  const widthPct = grown ? Math.min(Math.max(pct * 100, spent > 0 ? 4 : 0), 100) : 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Spent {currency.format(spent)} of {currency.format(Math.max(discretionary, 0))}
        </span>
        <span
          className={`font-semibold ${over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
        >
          {over ? '−' : ''}
          {currency.format(Math.abs(remaining))} {over ? 'over' : 'left'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${settled ? 'duration-300' : 'duration-[1250ms] ease-out'} ${over ? 'bg-rose-500' : nearingLimit ? 'bg-amber-500' : 'bg-accent'}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {(over || nearingLimit) && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${over ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}
        >
          <span aria-hidden="true">{over ? '⚠️' : '⏳'}</span>
          {over
            ? "You've spent past this month's discretionary budget."
            : `You've used ${Math.round(pct * 100)}% of this month's discretionary budget.`}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        This month's income ({currency.format(income)}) minus fixed bills ({currency.format(bills)}) leaves{' '}
        {currency.format(Math.max(discretionary, 0))} for spending.
      </p>
    </section>
  )
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

function BarList({ rows }: { rows: { label: string; total: number }[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1)
  const { grown, settled } = useGrowIn(1250)
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
              className={`h-full rounded-full bg-accent transition-all ${settled ? 'duration-300' : 'duration-[1250ms] ease-out'}`}
              style={{ width: `${grown ? Math.max((r.total / max) * 100, 4) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Summary() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [incomes, setIncomes] = useState<Income[] | null>(null)

  useEffect(() => {
    listExpenses().then(setExpenses)
    listBills().then(setBills)
    listIncomes().then(setIncomes)
  }, [])

  const monthSpent = useMemo(() => {
    const monthKey = currentMonthKey()
    return (expenses ?? []).filter((e) => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.total, 0)
  }, [expenses])

  const monthlyIncomeTotal = totalMonthlyIncome(incomes ?? [])
  const monthlyBillsTotal = totalMonthlyBills(bills ?? [])

  if (expenses === null) {
    return <p className="px-4 py-6 text-slate-500 dark:text-slate-400">Loading…</p>
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6">
        <MonthlyBudget income={monthlyIncomeTotal} bills={monthlyBillsTotal} spent={monthSpent} />
        <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-500 dark:text-slate-400">
          <div className="text-4xl">📊</div>
          <p>Add a few expenses to see totals here.</p>
        </div>
      </div>
    )
  }

  const monthKey = currentMonthKey()
  const thisMonthExpenses = expenses.filter((e) => e.date.startsWith(monthKey))
  const byCategory = totalsByCategory(thisMonthExpenses).map((c) => ({ label: c.category, total: c.total }))
  const byMonth = totalsByMonth(expenses)
    .slice(0, 6)
    .map((m) => ({ label: monthLabel(m.month), total: m.total }))

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <MonthlyBudget income={monthlyIncomeTotal} bills={monthlyBillsTotal} spent={monthSpent} />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-6">
        <section className="lg:flex-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            By Category · This Month
          </h2>
          {byCategory.length > 0 ? (
            <BarList rows={byCategory} />
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">No expenses logged this month yet.</p>
          )}
        </section>

        <section className="lg:flex-1">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            By Month
          </h2>
          <BarList rows={byMonth} />
        </section>
      </div>
    </div>
  )
}
