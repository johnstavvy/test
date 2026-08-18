import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES, db, type Category, type Expense } from '../db'
import { deleteExpense, updateExpense } from '../lib/expenses'
import { useToast } from '../lib/toast'
import { addToTrash, removeFromTrash } from '../lib/trash'

export default function ExpenseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    db.expenses.get(Number(id)).then((e) => setExpense(e ?? null))
  }, [id])

  if (!expense) {
    return <p className="px-4 py-6 text-slate-500 dark:text-slate-400">Loading…</p>
  }

  function set<K extends keyof Expense>(key: K, value: Expense[K]) {
    setExpense((prev) => (prev ? { ...prev, [key]: value } : prev))
    setSaved(false)
  }

  async function handleSave() {
    if (!expense) return
    await updateExpense(expense.id, {
      merchant: expense.merchant,
      date: expense.date,
      total: expense.total,
      category: expense.category,
    })
    setSaved(true)
  }

  async function handleDelete() {
    if (!expense) return
    const toDelete = expense
    await deleteExpense(toDelete.id)
    const trashId = await addToTrash('expense', toDelete)
    navigate('/')
    toast.show({
      message: `Deleted "${toDelete.merchant}"`,
      actionLabel: 'Undo',
      onAction: async () => {
        await db.expenses.put(toDelete)
        await removeFromTrash(trashId)
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:mx-auto lg:max-w-xl">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit expense</h1>

      {expense.imageDataUrl && (
        <img
          src={expense.imageDataUrl}
          alt="Receipt"
          className="max-h-56 w-full rounded-2xl object-contain shadow"
        />
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        Merchant
        <input
          value={expense.merchant}
          onChange={(e) => set('merchant', e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Date
          <input
            type="date"
            value={expense.date}
            onChange={(e) => set('date', e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          Total ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={expense.total}
            onChange={(e) => set('total', parseFloat(e.target.value) || 0)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        Category
        <select
          value={expense.category}
          onChange={(e) => set('category', e.target.value as Category)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {expense.rawText && (
        <details className="text-sm text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer font-medium">Raw scanned text</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800">{expense.rawText}</pre>
        </details>
      )}

      <div className="mt-2 flex gap-3">
        <button
          onClick={handleDelete}
          className="flex-1 rounded-full border border-red-300 px-4 py-3.5 font-medium text-red-600 transition-transform duration-150 active:scale-[0.97] active:bg-red-50 dark:border-red-800 dark:text-red-400 dark:active:bg-red-950"
        >
          Delete
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-full bg-accent px-4 py-3.5 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90"
        >
          {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
