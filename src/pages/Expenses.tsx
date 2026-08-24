import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type Expense } from '../db'
import { deleteExpense, listExpenses } from '../lib/expenses'
import { dateFromIso, humanDayLabel, isoDate, mondayOf } from '../lib/week'
import { IconChevronDown, IconReceipt, IconScan, IconSearch } from '../lib/icons'
import { useSwipeToDelete } from '../lib/useSwipeToDelete'
import { useToast } from '../lib/toast'
import { useCategories } from '../lib/userCategories'
import { addToTrash, removeFromTrash } from '../lib/trash'
import { ExpandingSheet } from '../lib/expandingSheet'
import { HeaderAction } from '../lib/headerAction'
import Capture from './Capture'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const CATEGORY_DOT: Record<string, string> = {
  Groceries: 'bg-emerald-500',
  Dining: 'bg-orange-500',
  Transport: 'bg-blue-500',
  Shopping: 'bg-purple-500',
  Utilities: 'bg-yellow-500',
  Health: 'bg-rose-500',
  Entertainment: 'bg-pink-500',
  Travel: 'bg-cyan-500',
  'Personal Care': 'bg-violet-500',
  'Home & Garden': 'bg-teal-500',
  Pets: 'bg-amber-500',
  Education: 'bg-indigo-500',
  'Gifts & Donations': 'bg-fuchsia-500',
  'Fees & Charges': 'bg-stone-500',
  Other: 'bg-slate-400',
}

function weekRangeLabel(mondayIso: string) {
  const start = dateFromIso(mondayIso)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: (e: Expense) => void }) {
  const swipe = useSwipeToDelete(88)

  return (
    <div className="relative overflow-hidden">
      <button
        onClick={() => onDelete(expense)}
        aria-label={`Delete ${expense.merchant}`}
        className="absolute inset-y-1 right-0 flex w-20 items-center justify-center rounded-full bg-rose-500 text-sm font-semibold text-white transition-opacity active:opacity-80"
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
        className="relative flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 py-3 transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] dark:bg-[#17181b] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{expense.merchant}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_DOT[expense.category] ?? CATEGORY_DOT.Other}`} />
            <span className="truncate">{expense.category}</span>
            <span>·</span>
            <span className="shrink-0">{humanDayLabel(expense.date)}</span>
          </div>
        </div>
        <p className="tabular-nums ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
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
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center justify-between border-b border-slate-100 py-3 transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
      >
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {items.length} {items.length === 1 ? 'expense' : 'expenses'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">{currency.format(total)}</span>
          <IconChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <ul className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-3">
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
  const toast = useToast()
  const { categories } = useCategories()

  useEffect(() => {
    listExpenses().then(setExpenses)
  }, [])

  // Reads the rect from whichever trigger was actually clicked (the mobile header
  // button and the desktop inline button are both mounted at once, CSS-hidden per
  // breakpoint) rather than a single shared ref, so the sheet's FLIP animation
  // always grows out of the trigger the user can actually see.
  function openAddExpense(e: React.MouseEvent<HTMLButtonElement>) {
    setOriginRect(e.currentTarget.getBoundingClientRect())
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
      <HeaderAction>
        <button
          onClick={openAddExpense}
          aria-label="Scan receipt"
          className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95"
        >
          <IconScan className="h-4 w-4" />
          Scan
        </button>
      </HeaderAction>

      <ExpandingSheet open={sheetOpen} originRect={originRect} onClose={() => setSheetOpen(false)} title="Add Expense">
        <Capture onSaved={handleExpenseSaved} />
      </ExpandingSheet>

      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{isFiltering ? 'Matching' : 'Total tracked'}</p>
            <h1 className="tabular-nums text-[42px] font-medium leading-none tracking-[-0.03em] text-slate-900 dark:text-slate-100">
              {currency.format(total)}
            </h1>
          </div>
          <button
            onClick={openAddExpense}
            className="hidden shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-95 lg:flex"
          >
            <IconScan className="h-4 w-4" />
            Scan receipt
          </button>
        </div>

        {expenses !== null && expenses.length > 0 && (
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant…"
              className="min-w-0 flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
            >
              <option value="All">All categories</option>
              {categories.map((c) => (
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
