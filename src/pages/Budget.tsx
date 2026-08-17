import { useEffect, useMemo, useState } from 'react'
import { BILL_CATEGORIES, type Bill, type BillCategory, type Expense, type Income } from '../db'
import { addBill, daysUntilDue, deleteBill, listBills, totalMonthlyBills, updateBill } from '../lib/bills'
import { addIncome, deleteIncome, listIncomes, totalMonthlyIncome, updateIncome } from '../lib/income'
import { listExpenses } from '../lib/expenses'
import { currentMonthKey } from '../lib/week'
import { getPeopleNames, setPersonName } from '../lib/people'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const BILL_CATEGORY_COLORS: Record<string, string> = {
  'Mortgage/Rent': 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  Electricity: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  Gas: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Water: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Internet: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  Subscription: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  Insurance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  Other: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

const inputClass =
  'rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
const labelClass = 'flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300'

// Formats a day-of-month as "1st", "2nd", "3rd", "4th", ... "11th", "21st", etc.
function ordinal(n: number): string {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return `${n}st`
  if (j === 2 && k !== 12) return `${n}nd`
  if (j === 3 && k !== 13) return `${n}rd`
  return `${n}th`
}

function dueLabel(days: number, dueDay: number) {
  const day = ordinal(dueDay)
  if (days === 0) return `Due today · the ${day}`
  if (days === 1) return `Due tomorrow · the ${day}`
  return `Due the ${day} · in ${days}d`
}

// ---------- Bills ----------

type BillDraft = Omit<Bill, 'id' | 'createdAt'>

function emptyBillDraft(): BillDraft {
  return { name: '', category: 'Other', amount: 0, dueDay: 1, notes: '' }
}

function BillForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: BillDraft
  onSave: (draft: BillDraft) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(initial)

  function set<K extends keyof BillDraft>(key: K, value: BillDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-white p-4 shadow-sm dark:bg-slate-800">
      <label className={labelClass}>
        Name
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Mortgage"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Category
        <select
          value={draft.category}
          onChange={(e) => set('category', e.target.value as BillCategory)}
          className={inputClass}
        >
          {BILL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <label className={`flex-1 ${labelClass}`}>
          Amount ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={draft.amount}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </label>
        <label className={`flex-1 ${labelClass}`}>
          Due day
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={draft.dueDay}
            onChange={(e) => set('dueDay', Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Notes (optional)
        <input value={draft.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
      </label>

      <div className="mt-1 flex gap-3">
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-1 rounded-full border border-red-300 px-4 py-3 font-medium text-red-600 transition-transform duration-150 active:scale-[0.97] active:bg-red-50 dark:border-red-800 dark:text-red-400 dark:active:bg-red-950"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          disabled={!draft.name.trim()}
          className="flex-1 rounded-full bg-accent px-4 py-3 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function BillsSection({ bills, reload }: { bills: Bill[]; reload: () => void }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  const sorted = useMemo(
    () => [...bills].sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay)),
    [bills],
  )

  async function handleSave(draft: BillDraft) {
    if (editing === 'new') await addBill(draft)
    else if (typeof editing === 'number') await updateBill(editing, draft)
    setEditing(null)
    reload()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this bill?')) return
    await deleteBill(id)
    setEditing(null)
    reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monthly bills total</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {currency.format(totalMonthlyBills(bills))}
          </p>
        </div>
        {editing !== 'new' && (
          <button
            onClick={() => setEditing('new')}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97]"
          >
            + Add bill
          </button>
        )}
      </div>

      {editing === 'new' && (
        <BillForm initial={emptyBillDraft()} onSave={handleSave} onCancel={() => setEditing(null)} />
      )}

      {sorted.length === 0 && editing !== 'new' && (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-slate-500 dark:text-slate-400">
          <div className="text-4xl">🏠</div>
          <p>No household bills yet. Add your mortgage, utilities, or subscriptions.</p>
        </div>
      )}

      <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
        {sorted.map((bill) => {
          const days = daysUntilDue(bill.dueDay)
          const soon = days <= 3
          return (
            <li key={bill.id}>
              {editing === bill.id ? (
                <BillForm
                  initial={{ name: bill.name, category: bill.category, amount: bill.amount, dueDay: bill.dueDay, notes: bill.notes }}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                  onDelete={() => handleDelete(bill.id)}
                />
              ) : (
                <button
                  onClick={() => setEditing(bill.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700 lg:hover:border-accent/40 lg:hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${BILL_CATEGORY_COLORS[bill.category] ?? BILL_CATEGORY_COLORS.Other}`}
                      >
                        {bill.category}
                      </span>
                      <span className={`text-xs ${soon ? 'font-semibold text-accent' : 'text-slate-400 dark:text-slate-500'}`}>
                        {dueLabel(days, bill.dueDay)}
                      </span>
                    </div>
                  </div>
                  <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                    {currency.format(bill.amount)}
                  </p>
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------- Income ----------

type IncomeDraft = Omit<Income, 'id' | 'createdAt'> & { person: 1 | 2 }

function emptyIncomeDraft(person: 1 | 2): IncomeDraft {
  return { source: '', amount: 0, payDay: 1, person, notes: '' }
}

function personOf(income: Income): 1 | 2 {
  return income.person === 2 ? 2 : 1
}

function IncomeForm({
  initial,
  names,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: IncomeDraft
  names: [string, string]
  onSave: (draft: IncomeDraft) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(initial)

  function set<K extends keyof IncomeDraft>(key: K, value: IncomeDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-white p-4 shadow-sm dark:bg-slate-800">
      <label className={labelClass}>
        Source
        <input
          value={draft.source}
          onChange={(e) => set('source', e.target.value)}
          placeholder="e.g. Paycheck"
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        Person
        <div className="flex gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800">
          {([1, 2] as const).map((p) => (
            <button
              key={p}
              onClick={() => set('person', p)}
              className={`flex-1 truncate rounded-lg py-1.5 text-sm font-medium transition-colors ${
                draft.person === p ? 'bg-accent text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {names[p - 1]}
            </button>
          ))}
        </div>
      </label>

      <div className="flex gap-3">
        <label className={`flex-1 ${labelClass}`}>
          Amount ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={draft.amount}
            onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </label>
        <label className={`flex-1 ${labelClass}`}>
          Pay day
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={draft.payDay}
            onChange={(e) => set('payDay', Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Notes (optional)
        <input value={draft.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
      </label>

      <div className="mt-1 flex gap-3">
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-1 rounded-full border border-red-300 px-4 py-3 font-medium text-red-600 transition-transform duration-150 active:scale-[0.97] active:bg-red-50 dark:border-red-800 dark:text-red-400 dark:active:bg-red-950"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-600 dark:border-slate-600 dark:text-slate-300"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          disabled={!draft.source.trim()}
          className="flex-1 rounded-full bg-accent px-4 py-3 font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97] active:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

function CashFlowChart({ income, outgoing }: { income: number; outgoing: number }) {
  const max = Math.max(income, outgoing, 1)
  const net = income - outgoing

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        This month
      </p>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Income</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">{currency.format(income)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.max((income / max) * 100, income > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Outgoing</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">{currency.format(outgoing)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-rose-500 transition-all duration-300"
            style={{ width: `${Math.max((outgoing / max) * 100, outgoing > 0 ? 4 : 0)}%` }}
          />
        </div>
      </div>

      <div className="mt-1 flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
        <span className="font-medium text-slate-700 dark:text-slate-300">Net</span>
        <span className={`font-semibold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {net >= 0 ? '+' : ''}
          {currency.format(net)}
        </span>
      </div>
    </div>
  )
}

function PersonHeader({
  name,
  subtotal,
  renaming,
  onStartRename,
  nameDraft,
  onNameDraftChange,
  onSaveRename,
}: {
  name: string
  subtotal: number
  renaming: boolean
  onStartRename: () => void
  nameDraft: string
  onNameDraftChange: (v: string) => void
  onSaveRename: () => void
}) {
  if (renaming) {
    return (
      <input
        autoFocus
        value={nameDraft}
        onChange={(e) => onNameDraftChange(e.target.value)}
        onBlur={onSaveRename}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        className="rounded-lg border border-accent/40 bg-white px-2 py-1 text-sm font-semibold text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
      />
    )
  }
  return (
    <button
      onClick={onStartRename}
      className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300"
    >
      {name}
      <span className="text-xs text-slate-400 dark:text-slate-500">✎</span>
      <span className="font-normal text-slate-400 dark:text-slate-500">· {currency.format(subtotal)}</span>
    </button>
  )
}

function IncomeSection({
  incomes,
  billsTotal,
  monthExpensesTotal,
  reload,
}: {
  incomes: Income[]
  billsTotal: number
  monthExpensesTotal: number
  reload: () => void
}) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [newPerson, setNewPerson] = useState<1 | 2>(1)
  const [names, setNames] = useState<[string, string]>(() => getPeopleNames())
  const [renaming, setRenaming] = useState<0 | 1 | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  const incomeTotal = totalMonthlyIncome(incomes)
  const outgoing = billsTotal + monthExpensesTotal

  const byPerson = useMemo(() => {
    const groups: Record<1 | 2, Income[]> = { 1: [], 2: [] }
    for (const income of incomes) groups[personOf(income)].push(income)
    for (const key of [1, 2] as const) groups[key].sort((a, b) => a.payDay - b.payDay)
    return groups
  }, [incomes])

  function startRename(idx: 0 | 1) {
    setNameDraft(names[idx])
    setRenaming(idx)
  }

  function saveRename() {
    if (renaming === null) return
    const updated = setPersonName(renaming, nameDraft)
    setNames(updated)
    setRenaming(null)
  }

  async function handleSave(draft: IncomeDraft) {
    if (editing === 'new') await addIncome(draft)
    else if (typeof editing === 'number') await updateIncome(editing, draft)
    setEditing(null)
    reload()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this income source?')) return
    await deleteIncome(id)
    setEditing(null)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <CashFlowChart income={incomeTotal} outgoing={outgoing} />

      {([1, 2] as const).map((personNum) => {
        const idx = (personNum - 1) as 0 | 1
        const list = byPerson[personNum]
        const isAddingHere = editing === 'new' && newPerson === personNum

        return (
          <div key={personNum} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <PersonHeader
                name={names[idx]}
                subtotal={totalMonthlyIncome(list)}
                renaming={renaming === idx}
                onStartRename={() => startRename(idx)}
                nameDraft={nameDraft}
                onNameDraftChange={setNameDraft}
                onSaveRename={saveRename}
              />
              {editing !== 'new' && (
                <button
                  onClick={() => {
                    setNewPerson(personNum)
                    setEditing('new')
                  }}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97]"
                >
                  + Add income
                </button>
              )}
            </div>

            {isAddingHere && (
              <IncomeForm
                initial={emptyIncomeDraft(personNum)}
                names={names}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
              />
            )}

            {list.length === 0 && !isAddingHere && (
              <p className="px-1 py-3 text-center text-sm text-slate-400 dark:text-slate-500">
                No income sources yet.
              </p>
            )}

            <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
              {list.map((income) => (
                <li key={income.id}>
                  {editing === income.id ? (
                    <IncomeForm
                      initial={{
                        source: income.source,
                        amount: income.amount,
                        payDay: income.payDay,
                        person: personOf(income),
                        notes: income.notes,
                      }}
                      names={names}
                      onSave={handleSave}
                      onCancel={() => setEditing(null)}
                      onDelete={() => handleDelete(income.id)}
                    />
                  ) : (
                    <button
                      onClick={() => setEditing(income.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700 lg:hover:border-accent/40 lg:hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{income.source}</p>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Paid on the {ordinal(income.payDay)}
                        </span>
                      </div>
                      <p className="ml-3 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                        {currency.format(income.amount)}
                      </p>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Page ----------

export default function Budget() {
  const [section, setSection] = useState<'bills' | 'income'>('bills')
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [incomes, setIncomes] = useState<Income[] | null>(null)
  const [expenses, setExpenses] = useState<Expense[] | null>(null)

  function reload() {
    listBills().then(setBills)
    listIncomes().then(setIncomes)
    listExpenses().then(setExpenses)
  }

  useEffect(reload, [])

  if (bills === null || incomes === null || expenses === null) {
    return <p className="px-4 py-6 text-slate-500 dark:text-slate-400">Loading…</p>
  }

  const monthKey = currentMonthKey()
  const monthExpensesTotal = expenses.filter((e) => e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.total, 0)

  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:mx-auto lg:max-w-3xl">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Budget</h1>

      <div className="flex gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
        {(['bills', 'income'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
              section === s ? 'bg-accent text-white' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === 'bills' ? (
        <BillsSection bills={bills} reload={reload} />
      ) : (
        <IncomeSection
          incomes={incomes}
          billsTotal={totalMonthlyBills(bills)}
          monthExpensesTotal={monthExpensesTotal}
          reload={reload}
        />
      )}
    </div>
  )
}
