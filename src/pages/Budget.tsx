import { useEffect, useMemo, useState } from 'react'
import { BILL_CATEGORIES, db, type Bill, type BillCategory, type Expense, type Income } from '../db'
import { addBill, daysUntilDue, deleteBill, effectiveAmount, listBills, totalMonthlyBills, updateBill } from '../lib/bills'
import { addIncome, deleteIncome, listIncomes, totalMonthlyIncome, updateIncome } from '../lib/income'
import { listExpenses } from '../lib/expenses'
import { currentMonthKey } from '../lib/week'
import { usePeopleNames } from '../lib/people'
import { isRecurring } from '../lib/recurring'
import { useToast } from '../lib/toast'
import { addToTrash, removeFromTrash } from '../lib/trash'
import { useGrowIn } from '../lib/useGrowIn'

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

// Which of the two household members an entry belongs to; missing/legacy rows default to person 1.
function personOf(entity: { person?: 1 | 2 }): 1 | 2 {
  return entity.person === 2 ? 2 : 1
}

function FrequencyToggle({ recurring, onChange }: { recurring: boolean; onChange: (recurring: boolean) => void }) {
  return (
    <div className="flex gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800">
      {([true, false] as const).map((value) => (
        <button
          key={String(value)}
          onClick={() => onChange(value)}
          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
            recurring === value ? 'bg-accent text-white' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {value ? 'Recurring monthly' : 'One-time'}
        </button>
      ))}
    </div>
  )
}

// ---------- Bills ----------

type BillDraft = Omit<Bill, 'id' | 'createdAt'>

function emptyBillDraft(category: BillCategory = 'Other', person: 1 | 2 = 1): BillDraft {
  return { name: '', category, amount: 0, dueDay: 1, person, paymentSource: '', recurring: true, notes: '' }
}

type BillGroupKey = 'home' | 'subscriptions'

const BILL_GROUPS: {
  key: BillGroupKey
  label: string
  match: (category: BillCategory) => boolean
  defaultCategory: BillCategory
  emptyIcon: string
  emptyText: string
}[] = [
  {
    key: 'home',
    label: 'Home Payments',
    match: (category) => category !== 'Subscription',
    defaultCategory: 'Mortgage/Rent',
    emptyIcon: '🏠',
    emptyText: 'No household bills yet. Add your mortgage, utilities, or insurance.',
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    match: (category) => category === 'Subscription',
    defaultCategory: 'Subscription',
    emptyIcon: '📺',
    emptyText: 'No subscriptions yet. Add streaming, software, or memberships.',
  },
]

function BillForm({
  initial,
  names,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: BillDraft
  names?: [string, string]
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

      {draft.category === 'Subscription' && names && (
        <label className={labelClass}>
          Person
          <div className="flex gap-1 rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-800">
            {([1, 2] as const).map((p) => (
              <button
                key={p}
                onClick={() => set('person', p)}
                className={`flex-1 truncate rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  personOf(draft) === p ? 'bg-accent text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {names[p - 1]}
              </button>
            ))}
          </div>
        </label>
      )}

      <label className={labelClass}>
        Frequency
        <FrequencyToggle recurring={isRecurring(draft)} onChange={(recurring) => set('recurring', recurring)} />
      </label>

      <div className="flex gap-3">
        <label className={`flex-1 ${labelClass}`}>
          Amount ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={Number.isNaN(draft.amount) ? '' : draft.amount}
            onChange={(e) => set('amount', e.target.value === '' ? NaN : parseFloat(e.target.value))}
            onBlur={() => Number.isNaN(draft.amount) && set('amount', 0)}
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
            value={Number.isNaN(draft.dueDay) ? '' : draft.dueDay}
            onChange={(e) =>
              set('dueDay', e.target.value === '' ? NaN : Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))
            }
            onBlur={() => Number.isNaN(draft.dueDay) && set('dueDay', 1)}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Bank / Card (optional)
        <input
          value={draft.paymentSource ?? ''}
          onChange={(e) => set('paymentSource', e.target.value)}
          placeholder="e.g. Chase Checking"
          className={inputClass}
        />
      </label>

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

function FrequencyBadge({ recurring, compact }: { recurring: boolean; compact?: boolean }) {
  const size = compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  if (recurring) {
    return <span className={`rounded-full bg-accent/15 font-semibold text-accent ${size}`}>Recurring</span>
  }
  return (
    <span className={`rounded-full bg-slate-100 font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400 ${size}`}>
      One-time
    </span>
  )
}

function TagBadge({ children, compact }: { children: string; compact?: boolean }) {
  const size = compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`truncate rounded-full bg-slate-100 font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400 ${size}`}
    >
      {children}
    </span>
  )
}

function BillListItem({ bill, compact, onClick }: { bill: Bill; compact?: boolean; onClick: () => void }) {
  const days = daysUntilDue(bill.dueDay)
  const soon = days <= 3
  const amount = effectiveAmount(bill)
  const needsUpdate = amount === 0 && bill.amount !== 0

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex w-full flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
      >
        <p className="w-full truncate text-sm font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
        <FrequencyBadge recurring={isRecurring(bill)} compact />
        {bill.paymentSource && <TagBadge compact>{bill.paymentSource}</TagBadge>}
        <span
          className={`truncate text-[11px] ${soon ? 'font-semibold text-accent' : 'text-slate-400 dark:text-slate-500'}`}
        >
          {dueLabel(days, bill.dueDay)}
        </span>
        <span
          className={`text-xs font-semibold ${needsUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {currency.format(amount)}
          {needsUpdate && ' · update'}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700 lg:hover:border-accent/40 lg:hover:shadow-sm"
    >
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${BILL_CATEGORY_COLORS[bill.category] ?? BILL_CATEGORY_COLORS.Other}`}
        >
          {bill.category}
        </span>
        <FrequencyBadge recurring={isRecurring(bill)} />
        {bill.paymentSource && <TagBadge>{bill.paymentSource}</TagBadge>}
        <span className={`text-xs ${soon ? 'font-semibold text-accent' : 'text-slate-400 dark:text-slate-500'}`}>
          {dueLabel(days, bill.dueDay)}
        </span>
      </div>
      <p
        className={`ml-3 shrink-0 font-semibold ${needsUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}
      >
        {currency.format(amount)}
        {needsUpdate && <span className="block text-right text-[11px] font-medium">update</span>}
      </p>
    </button>
  )
}

function BillsSection({ bills, query, reload }: { bills: Bill[]; query: string; reload: () => void }) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [newGroupKey, setNewGroupKey] = useState<BillGroupKey>('home')
  const [newSubPerson, setNewSubPerson] = useState<1 | 2>(1)
  const { names, renaming, nameDraft, setNameDraft, startRename, saveRename } = usePeopleNames()
  const toast = useToast()
  const q = query.trim().toLowerCase()
  const matches = (name: string) => !q || name.toLowerCase().includes(q)

  const grouped = useMemo(() => {
    const groups: Record<BillGroupKey, Bill[]> = { home: [], subscriptions: [] }
    for (const bill of bills) {
      const group = BILL_GROUPS.find((g) => g.match(bill.category)) ?? BILL_GROUPS[0]
      groups[group.key].push(bill)
    }
    for (const key of Object.keys(groups) as BillGroupKey[]) {
      groups[key].sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay))
    }
    return groups
  }, [bills])

  async function handleSave(draft: BillDraft) {
    if (editing === 'new') await addBill(draft)
    else if (typeof editing === 'number') await updateBill(editing, draft)
    setEditing(null)
    reload()
  }

  async function handleDelete(bill: Bill) {
    await deleteBill(bill.id)
    const trashId = await addToTrash('bill', bill)
    setEditing(null)
    reload()
    toast.show({
      message: `Deleted "${bill.name}"`,
      actionLabel: 'Undo',
      onAction: async () => {
        await db.bills.put(bill)
        await removeFromTrash(trashId)
        reload()
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Monthly bills total</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {currency.format(totalMonthlyBills(bills))}
        </p>
      </div>

      {BILL_GROUPS.map((group) => {
        const list = grouped[group.key]
        const isAddingHere = editing === 'new' && newGroupKey === group.key

        if (group.key === 'subscriptions') {
          const editingBill = typeof editing === 'number' ? list.find((b) => b.id === editing) : undefined

          return (
            <div key={group.key} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {group.label}{' '}
                <span className="font-normal text-slate-400 dark:text-slate-500">
                  · {currency.format(totalMonthlyBills(list))}
                </span>
              </p>

              {isAddingHere && (
                <BillForm
                  initial={emptyBillDraft(group.defaultCategory, newSubPerson)}
                  names={names}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                />
              )}

              {editingBill && (
                <BillForm
                  initial={{
                    name: editingBill.name,
                    category: editingBill.category,
                    amount: effectiveAmount(editingBill),
                    dueDay: editingBill.dueDay,
                    person: personOf(editingBill),
                    paymentSource: editingBill.paymentSource,
                    recurring: isRecurring(editingBill),
                    notes: editingBill.notes,
                  }}
                  names={names}
                  onSave={handleSave}
                  onCancel={() => setEditing(null)}
                  onDelete={() => handleDelete(editingBill)}
                />
              )}

              {list.length === 0 && !isAddingHere && (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="text-3xl">{group.emptyIcon}</div>
                  <p className="text-sm">{group.emptyText}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {([1, 2] as const).map((personNum) => {
                  const idx = (personNum - 1) as 0 | 1
                  const personList = list.filter((bill) => personOf(bill) === personNum)
                  const visiblePersonList = personList.filter((bill) => matches(bill.name) || bill.id === editing)

                  return (
                    <div key={personNum} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-1">
                        <PersonHeader
                          name={names[idx]}
                          subtotal={totalMonthlyBills(personList)}
                          renaming={renaming === idx}
                          onStartRename={() => startRename(idx)}
                          nameDraft={nameDraft}
                          onNameDraftChange={setNameDraft}
                          onSaveRename={saveRename}
                        />
                        {editing !== 'new' && (
                          <button
                            onClick={() => {
                              setNewGroupKey('subscriptions')
                              setNewSubPerson(personNum)
                              setEditing('new')
                            }}
                            className="shrink-0 rounded-full bg-accent px-2 py-1 text-xs font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97]"
                          >
                            +
                          </button>
                        )}
                      </div>

                      {visiblePersonList.length === 0 ? (
                        <p className="px-1 text-xs text-slate-400 dark:text-slate-500">
                          {personList.length === 0 ? 'None yet.' : 'No matches.'}
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {visiblePersonList.map((bill) => (
                            <li key={bill.id}>
                              <BillListItem compact bill={bill} onClick={() => setEditing(bill.id)} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        const visibleList = list.filter((bill) => matches(bill.name) || bill.id === editing)

        return (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {group.label}{' '}
                <span className="font-normal text-slate-400 dark:text-slate-500">
                  · {currency.format(totalMonthlyBills(list))}
                </span>
              </p>
              {editing !== 'new' && (
                <button
                  onClick={() => {
                    setNewGroupKey(group.key)
                    setEditing('new')
                  }}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97]"
                >
                  + Add
                </button>
              )}
            </div>

            {isAddingHere && (
              <BillForm
                initial={emptyBillDraft(group.defaultCategory)}
                names={names}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
              />
            )}

            {list.length === 0 && !isAddingHere && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                <div className="text-3xl">{group.emptyIcon}</div>
                <p className="text-sm">{group.emptyText}</p>
              </div>
            )}

            {list.length > 0 && visibleList.length === 0 && (
              <p className="px-1 py-3 text-center text-sm text-slate-400 dark:text-slate-500">No matches.</p>
            )}

            <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
              {visibleList.map((bill) => (
                <li key={bill.id}>
                  {editing === bill.id ? (
                    <BillForm
                      initial={{
                        name: bill.name,
                        category: bill.category,
                        amount: effectiveAmount(bill),
                        dueDay: bill.dueDay,
                        paymentSource: bill.paymentSource,
                        recurring: isRecurring(bill),
                        notes: bill.notes,
                      }}
                      names={names}
                      onSave={handleSave}
                      onCancel={() => setEditing(null)}
                      onDelete={() => handleDelete(bill)}
                    />
                  ) : (
                    <BillListItem bill={bill} onClick={() => setEditing(bill.id)} />
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

// ---------- Income ----------

type IncomeDraft = Omit<Income, 'id' | 'createdAt'> & { person: 1 | 2 }

function emptyIncomeDraft(person: 1 | 2): IncomeDraft {
  return { source: '', amount: 0, payDay: 1, person, recurring: true, notes: '' }
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

      <label className={labelClass}>
        Frequency
        <FrequencyToggle recurring={isRecurring(draft)} onChange={(recurring) => set('recurring', recurring)} />
      </label>

      <div className="flex gap-3">
        <label className={`flex-1 ${labelClass}`}>
          Amount ($)
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={Number.isNaN(draft.amount) ? '' : draft.amount}
            onChange={(e) => set('amount', e.target.value === '' ? NaN : parseFloat(e.target.value))}
            onBlur={() => Number.isNaN(draft.amount) && set('amount', 0)}
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
            value={Number.isNaN(draft.payDay) ? '' : draft.payDay}
            onChange={(e) =>
              set('payDay', e.target.value === '' ? NaN : Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))
            }
            onBlur={() => Number.isNaN(draft.payDay) && set('payDay', 1)}
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
  const { grown, settled } = useGrowIn(1000)
  const durationClass = settled ? 'duration-300' : 'duration-1000 ease-out'

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
            className={`h-full rounded-full bg-emerald-500 transition-all ${durationClass}`}
            style={{ width: `${grown ? Math.max((income / max) * 100, income > 0 ? 4 : 0) : 0}%` }}
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
            className={`h-full rounded-full bg-rose-500 transition-all ${durationClass}`}
            style={{ width: `${grown ? Math.max((outgoing / max) * 100, outgoing > 0 ? 4 : 0) : 0}%` }}
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
        className="rounded-lg border border-accent/40 bg-white px-2 py-1 text-base font-semibold text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
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
  query,
  billsTotal,
  monthExpensesTotal,
  reload,
}: {
  incomes: Income[]
  query: string
  billsTotal: number
  monthExpensesTotal: number
  reload: () => void
}) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [newPerson, setNewPerson] = useState<1 | 2>(1)
  const { names, renaming, nameDraft, setNameDraft, startRename, saveRename } = usePeopleNames()
  const toast = useToast()
  const q = query.trim().toLowerCase()
  const matches = (source: string) => !q || source.toLowerCase().includes(q)

  const incomeTotal = totalMonthlyIncome(incomes)
  const outgoing = billsTotal + monthExpensesTotal

  const byPerson = useMemo(() => {
    const groups: Record<1 | 2, Income[]> = { 1: [], 2: [] }
    for (const income of incomes) groups[personOf(income)].push(income)
    for (const key of [1, 2] as const) groups[key].sort((a, b) => a.payDay - b.payDay)
    return groups
  }, [incomes])

  async function handleSave(draft: IncomeDraft) {
    if (editing === 'new') await addIncome(draft)
    else if (typeof editing === 'number') await updateIncome(editing, draft)
    setEditing(null)
    reload()
  }

  async function handleDelete(income: Income) {
    await deleteIncome(income.id)
    const trashId = await addToTrash('income', income)
    setEditing(null)
    reload()
    toast.show({
      message: `Deleted "${income.source}"`,
      actionLabel: 'Undo',
      onAction: async () => {
        await db.incomes.put(income)
        await removeFromTrash(trashId)
        reload()
      },
    })
  }

  const editingIncome = typeof editing === 'number' ? incomes.find((i) => i.id === editing) : undefined
  const isAdding = editing === 'new'

  return (
    <div className="flex flex-col gap-4">
      <CashFlowChart income={incomeTotal} outgoing={outgoing} />

      {isAdding && (
        <IncomeForm
          initial={emptyIncomeDraft(newPerson)}
          names={names}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {editingIncome && (
        <IncomeForm
          initial={{
            source: editingIncome.source,
            amount: editingIncome.amount,
            payDay: editingIncome.payDay,
            person: personOf(editingIncome),
            recurring: isRecurring(editingIncome),
            notes: editingIncome.notes,
          }}
          names={names}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onDelete={() => handleDelete(editingIncome)}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {([1, 2] as const).map((personNum) => {
          const idx = (personNum - 1) as 0 | 1
          const list = byPerson[personNum]
          const visibleList = list.filter((income) => matches(income.source) || income.id === editing)

          return (
            <div key={personNum} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1">
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
                    className="shrink-0 rounded-full bg-accent px-2 py-1 text-xs font-semibold text-white shadow-sm transition-transform duration-150 active:scale-[0.97]"
                  >
                    +
                  </button>
                )}
              </div>

              {visibleList.length === 0 ? (
                <p className="px-1 text-xs text-slate-400 dark:text-slate-500">
                  {list.length === 0 ? 'None yet.' : 'No matches.'}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleList.map((income) => (
                    <li key={income.id}>
                      <button
                        onClick={() => setEditing(income.id)}
                        className="flex w-full flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-transform duration-150 active:scale-[0.98] active:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
                      >
                        <p className="w-full truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {income.source}
                        </p>
                        <FrequencyBadge recurring={isRecurring(income)} compact />
                        <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                          Paid the {ordinal(income.payDay)}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {currency.format(income.amount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Page ----------

export default function Budget() {
  const [section, setSection] = useState<'bills' | 'income'>('bills')
  const [query, setQuery] = useState('')
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

      {(section === 'bills' ? bills.length > 0 : incomes.length > 0) && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={section === 'bills' ? 'Search bills…' : 'Search income…'}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      )}

      {section === 'bills' ? (
        <BillsSection bills={bills} query={query} reload={reload} />
      ) : (
        <IncomeSection
          incomes={incomes}
          query={query}
          billsTotal={totalMonthlyBills(bills)}
          monthExpensesTotal={monthExpensesTotal}
          reload={reload}
        />
      )}
    </div>
  )
}
