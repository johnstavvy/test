import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES, db, type Expense } from '../db'
import { deleteExpense, listExpenses } from '../lib/expenses'
import { dateFromIso, isoDate, mondayOf } from '../lib/week'
import { IconChevronDown, IconReceipt, IconScan, IconSearch } from '../lib/icons'
import { useSwipeToDelete } from '../lib/useSwipeToDelete'
import { useToast } from '../lib/toast'
import { addToTrash, removeFromTrash } from '../lib/trash'
import { ExpandingSheet } from '../lib/expandingSheet'
import Capture from './Capture'

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

function weekRangeLabel(mondayIso: string) {
  const start = dateFromIso(mondayIso)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: (e: Expense) => void }) {
  const swipe = useSwipeToDelete(98)

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        onClick={() => onDelete(expense)}
        aria-label={`Delete ${expense.merchant}`}
        className="absolute inset-y-1.5 right-1.5 flex w-20 items-center justify-center rounded-xl bg-red-500 text-sm font-semibold text-white transition-opacity active:opacity-80"
      >
        Delete
      </button>
      <Link
        to={`/expense/${expense.id}`}
        draggable={false}
        onClickCapture={swipe.handleClickCapture}
        {...swipe.handlers}
        style={{
          transform: `translateX(${swipe.offset}px)`,
          transition: swipe.isDragging ? 'none' : 'transform 200ms ease-out',
          touchAction: 'pan-y',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
        }}
        className="relative flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:hover:border-accent/40 lg:hover:shadow-sm"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{expense.merchant}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.Other}`}
            >
              {expense.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{expense.date}</span>
          </div>
        </div>
        <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
          {currency.format(expense.total)}
        </p>
      </Link>
    </div>
  )
}

function WeekGroup({
  items,
  label,
  isOpen,
  onToggle,
  onDelete,
}: {
  items: Expense[]
  label: string
  isOpen: boolean
  onToggle: () => void
  onDelete: (e: Expense) => void
}) {
  const total = items.reduce((sum, e) => sum + e.total, 0)

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-transform duration-150 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {items.length} {items.length === 1 ? 'expense' : 'expenses'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{currency.format(total)}</span>
          <IconChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
          {items.map((e) => (
            <li key={e.id}>
              <ExpenseRow expense={e} onDelete={onDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null)
  const pillRef = useRef<HTMLButtonElement>(null)
  const toast = useToast()

  useEffect(() => {
    listExpenses().then(setExpenses)
  }, [])

  function openAddExpense() {
    setOriginRect(pillRef.current?.getBoundingClientRect() ?? null)
    setSheetOpen(true)
  }

  function handleExpenseSaved() {
    listExpenses().then(setExpenses)
    setSheetOpen(false)
  }

  async function handleDelete(expense: Expense) {
    await deleteExpense(expense.id)
    const trashId = await addToTrash('expense', expense)
    setExpenses((prev) => prev?.filter((e) => e.id !== expense.id) ?? prev)
    toast.show({
      message: `Deleted "${expense.merchant}"`,
      actionLabel: 'Undo',
      onAction: async () => {
        await db.expenses.put(expense)
        await removeFromTrash(trashId)
        listExpenses().then(setExpenses)
      },
    })
  }

  const isFiltering = query.trim() !== '' || categoryFilter !== 'All'

  const filtered = useMemo(() => {
    if (!expenses) return null
    const q = query.trim().toLowerCase()
    return expenses.filter((e) => {
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false
      if (q && !e.merchant.toLowerCase().includes(q)) return false
      return true
    })
  }, [expenses, query, categoryFilter])

  const total = filtered?.reduce((sum, e) => sum + e.total, 0) ?? 0

  // Expenses already arrive sorted by date descending, so each group's
  // items stay chronological (newest first) with no extra sort needed.
  const weekGroups = useMemo(() => {
    if (!filtered) return []
    const map = new Map<string, Expense[]>()
    for (const e of filtered) {
      const key = mondayOf(e.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const currentWeekKey = mondayOf(isoDate(new Date()))
  const currentMonday = dateFromIso(currentWeekKey)
  const lastWeekKey = isoDate(
    new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 7),
  )

  return (
    <>
      <ExpandingSheet open={sheetOpen} originRect={originRect} onClose={() => setSheetOpen(false)} title="Add Expense">
        <Capture onSaved={handleExpenseSaved} />
      </ExpandingSheet>

      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-30 -mx-4 flex justify-center bg-slate-50/90 px-4 py-2 backdrop-blur-lg dark:bg-slate-900/90 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <button
            ref={pillRef}
            onClick={openAddExpense}
            aria-label="Add expense"
            className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-transform duration-150 active:scale-95"
          >
            <IconScan className="h-4 w-4" />
            Add Expense
          </button>
        </div>

        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{isFiltering ? 'Matching' : 'Total tracked'}</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{currency.format(total)}</h1>
        </div>

        {expenses !== null && expenses.length > 0 && (
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant…"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {expenses === null && <p className="text-slate-500 dark:text-slate-400">Loading…</p>}

        {expenses !== null && expenses.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center text-slate-500 dark:text-slate-400">
            <IconReceipt className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p>No expenses yet. Tap the scan button to add your first receipt.</p>
          </div>
        )}

        {expenses !== null && expenses.length > 0 && filtered !== null && filtered.length === 0 && (
          <div className="mt-10 flex flex-col items-center gap-3 text-center text-slate-500 dark:text-slate-400">
            <IconSearch className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p>No expenses match your search.</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {weekGroups.map(([weekKey, items], index) => {
            const label =
              weekKey === currentWeekKey ? 'This week' : weekKey === lastWeekKey ? 'Last week' : weekRangeLabel(weekKey)
            const isOpen = isFiltering ? true : (overrides[weekKey] ?? index === 0)
            return (
              <WeekGroup
                key={weekKey}
                items={items}
                label={label}
                isOpen={isOpen}
                onToggle={() => setOverrides((prev) => ({ ...prev, [weekKey]: !isOpen }))}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
