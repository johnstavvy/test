import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { BILL_CATEGORIES, db, type Bill, type BillCategory, type Expense, type Income, type IncomeHistoryEntry } from '../db'
import {
  addBill,
  daysUntilDue,
  deleteBill,
  effectiveAmount,
  isBillPaidThisMonth,
  listBills,
  ordinal,
  setBillPaidThisMonth,
  totalMonthlyBills,
  updateBill,
} from '../lib/bills'
import {
  addIncome,
  deleteIncome,
  effectiveIncomeAmount,
  listIncomeHistory,
  listIncomes,
  totalMonthlyIncome,
  updateIncome,
} from '../lib/income'
import { listExpenses } from '../lib/expenses'
import { currentMonthKey, dateFromIso, isoDate, monthLabel } from '../lib/week'
import { usePeopleNames } from '../lib/people'
import { isRecurring } from '../lib/recurring'
import { useToast } from '../lib/toast'
import { addToTrash, removeFromTrash } from '../lib/trash'
import { useGrowIn } from '../lib/useGrowIn'
import { SegmentedControl } from '../lib/SegmentedControl'
import { HeaderAction } from '../lib/headerAction'
import { IconCar, IconCheck, IconChevronDown, IconHome, IconPencil, IconTv } from '../lib/icons'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const VEHICLE_CATEGORIES: BillCategory[] = ['Car Payment', 'Auto Insurance', 'Fuel', 'Maintenance']

const inputClass =
  'rounded-full border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100'
const labelClass = 'flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300'

// Which of the two household members an entry belongs to; missing/legacy rows default to person 1.
function personOf(entity: { person?: 1 | 2 }): 1 | 2 {
  return entity.person === 2 ? 2 : 1
}

// One muted meta line per row, at most 3 segments: due-or-paid status, bank/card, category
// — "Recurring" is implied for a monthly bill so it's never spelled out here.
function billMetaSegments(bill: Bill): string[] {
  const paid = isBillPaidThisMonth(bill)
  const status = paid ? 'paid this month' : dueStatus(bill)
  return [status, bill.paymentSource, bill.category].filter((s): s is string => !!s && s.trim() !== '')
}

function dueStatus(bill: Bill): string {
  const days = daysUntilDue(bill.dueDay)
  if (days === 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `due the ${ordinal(bill.dueDay)}`
}

function FrequencyToggle({ recurring, onChange }: { recurring: boolean; onChange: (recurring: boolean) => void }) {
  return (
    <SegmentedControl
      value={recurring}
      onChange={onChange}
      options={[
        { value: true, label: 'Recurring monthly' },
        { value: false, label: 'One-time' },
      ]}
    />
  )
}

function AutoPayToggle({ autoPay, onChange }: { autoPay: boolean; onChange: (autoPay: boolean) => void }) {
  return (
    <SegmentedControl
      value={autoPay}
      onChange={onChange}
      options={[
        { value: false, label: 'Manual' },
        { value: true, label: 'Auto-pay' },
      ]}
    />
  )
}

// ---------- Bills ----------

type BillDraft = Omit<Bill, 'id' | 'createdAt'>

function emptyBillDraft(category: BillCategory = 'Other', person: 1 | 2 = 1): BillDraft {
  return {
    name: '',
    category,
    amount: 0,
    dueDay: 1,
    person,
    paymentSource: '',
    recurring: true,
    autoPay: false,
    notes: '',
  }
}

type BillGroupKey = 'home' | 'vehicles' | 'subscriptions'

const BILL_GROUPS: {
  key: BillGroupKey
  label: string
  match: (category: BillCategory) => boolean
  defaultCategory: BillCategory
  emptyIcon: ComponentType<{ className?: string }>
  emptyText: string
}[] = [
  {
    key: 'home',
    label: 'Home Payments',
    match: (category) => category !== 'Subscription' && !VEHICLE_CATEGORIES.includes(category),
    defaultCategory: 'Mortgage/Rent',
    emptyIcon: IconHome,
    emptyText: 'No household bills yet. Add your mortgage, utilities, or insurance.',
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    match: (category) => VEHICLE_CATEGORIES.includes(category),
    defaultCategory: 'Car Payment',
    emptyIcon: IconCar,
    emptyText: 'No vehicle bills yet. Add a car payment, insurance, fuel, or maintenance.',
  },
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    match: (category) => category === 'Subscription',
    defaultCategory: 'Subscription',
    emptyIcon: IconTv,
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
    <div className="flex flex-col gap-3 rounded-3xl border border-accent/30 bg-white p-4 shadow-sm dark:bg-[#212327]">
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
          <SegmentedControl
            value={personOf(draft)}
            onChange={(p) => set('person', p)}
            options={[
              { value: 1, label: names[0] },
              { value: 2, label: names[1] },
            ]}
          />
        </label>
      )}

      <label className={labelClass}>
        Frequency
        <FrequencyToggle recurring={isRecurring(draft)} onChange={(recurring) => set('recurring', recurring)} />
      </label>

      <label className={labelClass}>
        Payment
        <AutoPayToggle autoPay={draft.autoPay ?? false} onChange={(autoPay) => set('autoPay', autoPay)} />
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
            className="flex-1 rounded-full border border-rose-300 px-4 py-3 font-medium text-rose-600 transition-transform duration-150 active:scale-[0.97] active:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:active:bg-rose-950"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-600 dark:border-[#3a3e45] dark:text-slate-300"
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

function TagBadge({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        tone === 'accent'
          ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400'
          : 'bg-slate-100 text-slate-500 dark:bg-[#2b2e33] dark:text-slate-400'
      }`}
    >
      {children}
    </span>
  )
}

function PaidToggle({ paid, onToggle, compact }: { paid: boolean; onToggle: () => void; compact?: boolean }) {
  const size = compact ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={paid}
      aria-label={paid ? 'Mark unpaid' : 'Mark paid'}
      className={`flex shrink-0 items-center justify-center rounded-full border transition-colors ${size} ${
        paid
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-slate-300 active:bg-slate-100 dark:border-[#3a3e45] dark:active:bg-[#2b2e33]'
      }`}
    >
      {paid && <IconCheck className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
    </button>
  )
}

function BillListItem({
  bill,
  onClick,
  onTogglePaid,
}: {
  bill: Bill
  onClick: () => void
  onTogglePaid: () => void
}) {
  const days = daysUntilDue(bill.dueDay)
  const soon = days <= 3
  const amount = effectiveAmount(bill)
  const needsUpdate = amount === 0 && bill.amount !== 0
  const paid = isBillPaidThisMonth(bill)
  const meta = billMetaSegments(bill).join(' · ')

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 py-3 text-left transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
          {!isRecurring(bill) && <TagBadge>One-time</TagBadge>}
          {bill.autoPay && <TagBadge tone="accent">Auto-pay</TagBadge>}
        </div>
        <p
          className={`truncate text-xs ${
            !paid && soon ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {meta}
        </p>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-3">
        <p
          className={`tabular-nums font-semibold ${needsUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {currency.format(amount)}
          {needsUpdate && <span className="block text-right text-[11px] font-medium">update</span>}
        </p>
        <PaidToggle paid={paid} onToggle={onTogglePaid} />
      </div>
    </button>
  )
}

function CompactBillListItem({
  bill,
  onClick,
  onTogglePaid,
}: {
  bill: Bill
  onClick: () => void
  onTogglePaid: () => void
}) {
  const amount = effectiveAmount(bill)
  const needsUpdate = amount === 0 && bill.amount !== 0
  const paid = isBillPaidThisMonth(bill)
  const days = daysUntilDue(bill.dueDay)
  const soon = days <= 3
  const meta = billMetaSegments(bill).join(' · ')

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-1 border-b border-slate-100 py-2.5 text-left transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{bill.name}</p>
        <PaidToggle paid={paid} onToggle={onTogglePaid} compact />
      </div>
      {(bill.autoPay || !isRecurring(bill)) && (
        <div className="flex items-center gap-1">
          {!isRecurring(bill) && <TagBadge>One-time</TagBadge>}
          {bill.autoPay && <TagBadge tone="accent">Auto-pay</TagBadge>}
        </div>
      )}
      <p
        className={`truncate text-[11px] ${
          !paid && soon ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {meta}
      </p>
      <span
        className={`tabular-nums text-xs font-semibold ${needsUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}
      >
        {currency.format(amount)}
        {needsUpdate && ' · update'}
      </span>
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
    const groups: Record<BillGroupKey, Bill[]> = { home: [], vehicles: [], subscriptions: [] }
    for (const bill of bills) {
      const group = BILL_GROUPS.find((g) => g.match(bill.category)) ?? BILL_GROUPS[0]
      groups[group.key].push(bill)
    }
    for (const key of Object.keys(groups) as BillGroupKey[]) {
      groups[key].sort((a, b) => {
        const aPaid = isBillPaidThisMonth(a) ? 1 : 0
        const bPaid = isBillPaidThisMonth(b) ? 1 : 0
        if (aPaid !== bPaid) return aPaid - bPaid
        return daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay)
      })
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

  async function handleTogglePaid(bill: Bill) {
    await setBillPaidThisMonth(bill, !isBillPaidThisMonth(bill))
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-[#31343a] dark:bg-[#212327]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
          Monthly bills total
        </p>
        <p className="tabular-nums text-[34px] font-medium leading-none tracking-[-0.03em] text-slate-900 dark:text-slate-100">
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {group.label}{' '}
                <span className="tabular-nums font-normal normal-case tracking-normal">
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
                    autoPay: editingBill.autoPay ?? false,
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
                  <group.emptyIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm">{group.emptyText}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {([1, 2] as const).map((personNum) => {
                  const idx = (personNum - 1) as 0 | 1
                  const personList = list.filter((bill) => personOf(bill) === personNum)
                  const visiblePersonList = personList.filter((bill) => matches(bill.name) || bill.id === editing)

                  return (
                    <div key={personNum} className="flex flex-col gap-1">
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
                        <p className="px-1 py-2 text-xs text-slate-400 dark:text-slate-500">
                          {personList.length === 0 ? 'None yet.' : 'No matches.'}
                        </p>
                      ) : (
                        <ul className="flex flex-col">
                          {visiblePersonList.map((bill) => (
                            <li key={bill.id}>
                              <CompactBillListItem
                                bill={bill}
                                onClick={() => setEditing(bill.id)}
                                onTogglePaid={() => handleTogglePaid(bill)}
                              />
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {group.label}{' '}
                <span className="tabular-nums font-normal normal-case tracking-normal">
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
                <group.emptyIcon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm">{group.emptyText}</p>
              </div>
            )}

            {list.length > 0 && visibleList.length === 0 && (
              <p className="px-1 py-3 text-center text-sm text-slate-400 dark:text-slate-500">No matches.</p>
            )}

            <ul className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-3">
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
                        autoPay: bill.autoPay ?? false,
                        notes: bill.notes,
                      }}
                      names={names}
                      onSave={handleSave}
                      onCancel={() => setEditing(null)}
                      onDelete={() => handleDelete(bill)}
                    />
                  ) : (
                    <BillListItem bill={bill} onClick={() => setEditing(bill.id)} onTogglePaid={() => handleTogglePaid(bill)} />
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

// `date` is UI-only — for a one-time entry it's the day the money actually came in (lets a
// missed/late entry be backdated to the month it belongs to); recurring entries ignore it
// and use `payDay` as an ongoing monthly cycle instead. See handleSave() in IncomeSection.
type IncomeDraft = Omit<Income, 'id' | 'createdAt'> & { person: 1 | 2; date: string }

function emptyIncomeDraft(person: 1 | 2): IncomeDraft {
  return { source: '', amount: 0, payDay: 1, person, recurring: true, notes: '', date: isoDate(new Date()) }
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
    <div className="flex flex-col gap-3 rounded-3xl border border-accent/30 bg-white p-4 shadow-sm dark:bg-[#212327]">
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
        <SegmentedControl
          value={draft.person}
          onChange={(p) => set('person', p)}
          options={[
            { value: 1, label: names[0] },
            { value: 2, label: names[1] },
          ]}
        />
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
        {isRecurring(draft) ? (
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
        ) : (
          <label className={`flex-1 ${labelClass}`}>
            Date received
            <input
              type="date"
              value={draft.date}
              max={isoDate(new Date())}
              onChange={(e) => set('date', e.target.value)}
              className={inputClass}
            />
          </label>
        )}
      </div>

      <label className={labelClass}>
        Notes (optional)
        <input value={draft.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
      </label>

      <div className="mt-1 flex gap-3">
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-1 rounded-full border border-rose-300 px-4 py-3 font-medium text-rose-600 transition-transform duration-150 active:scale-[0.97] active:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:active:bg-rose-950"
          >
            Delete
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-600 dark:border-[#3a3e45] dark:text-slate-300"
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
  const { grown, settled } = useGrowIn(1250)
  const durationClass = settled ? 'duration-300' : 'duration-[1250ms] ease-out'

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#31343a] dark:bg-[#212327]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
        This month
      </p>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Income</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">{currency.format(income)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#2b2e33]">
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
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#2b2e33]">
          <div
            className={`h-full rounded-full bg-rose-500 transition-all ${durationClass}`}
            style={{ width: `${grown ? Math.max((outgoing / max) * 100, outgoing > 0 ? 4 : 0) : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-1 flex items-baseline justify-between border-t border-slate-100 pt-3 dark:border-[#1e2027]">
        <span className="font-medium text-slate-700 dark:text-slate-300">Net</span>
        <span className={`tabular-nums font-semibold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
        className="rounded-full border border-accent/40 bg-white px-2.5 py-1 text-base font-semibold text-slate-900 focus:outline-none dark:bg-[#212327] dark:text-slate-100"
      />
    )
  }
  return (
    <button
      onClick={onStartRename}
      className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300"
    >
      {name}
      <IconPencil className="h-3 w-3 text-slate-400 dark:text-slate-500" />
      <span className="tabular-nums font-normal text-slate-400 dark:text-slate-500">
        · {currency.format(subtotal)}
      </span>
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
    const { date, ...rest } = draft
    const oneTime = !isRecurring(draft)
    const receivedAt = oneTime ? dateFromIso(date) : undefined
    const payload = oneTime ? { ...rest, payDay: receivedAt!.getDate() } : rest
    if (editing === 'new') await addIncome(payload, receivedAt)
    else if (typeof editing === 'number') await updateIncome(editing, payload, receivedAt)
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
            amount: effectiveIncomeAmount(editingIncome),
            payDay: editingIncome.payDay,
            person: personOf(editingIncome),
            recurring: isRecurring(editingIncome),
            notes: editingIncome.notes,
            date: isoDate(new Date(editingIncome.createdAt)),
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
            <div key={personNum} className="flex flex-col gap-1">
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
                <p className="px-1 py-2 text-xs text-slate-400 dark:text-slate-500">
                  {list.length === 0 ? 'None yet.' : 'No matches.'}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {visibleList.map((income) => {
                    const amount = effectiveIncomeAmount(income)
                    const needsUpdate = amount === 0 && income.amount !== 0
                    return (
                      <li key={income.id}>
                        <button
                          onClick={() => setEditing(income.id)}
                          className="flex w-full flex-col items-start gap-1 border-b border-slate-100 py-2.5 text-left transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] lg:hover:bg-slate-50 dark:lg:hover:bg-[#16181d]"
                        >
                          <p className="w-full truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {income.source}
                          </p>
                          <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {isRecurring(income) ? '' : 'One-time · '}Paid the {ordinal(income.payDay)}
                          </span>
                          <span
                            className={`tabular-nums text-xs font-semibold ${needsUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}`}
                          >
                            {currency.format(amount)}
                            {needsUpdate && ' · update'}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <IncomeHistorySection incomes={incomes} names={names} />
    </div>
  )
}

function IncomeHistorySection({ incomes, names }: { incomes: Income[]; names: [string, string] }) {
  const [history, setHistory] = useState<IncomeHistoryEntry[]>([])
  const [openMonth, setOpenMonth] = useState<string | null>(null)

  useEffect(() => {
    listIncomeHistory().then((entries) => {
      setHistory(entries)
      setOpenMonth((prev) => prev ?? entries[0]?.month ?? null)
    })
    // Re-fetch whenever incomes reload (a save can write a new history snapshot).
  }, [incomes])

  const byMonth = useMemo(() => {
    const groups: [string, IncomeHistoryEntry[]][] = []
    for (const entry of history) {
      const last = groups[groups.length - 1]
      if (last && last[0] === entry.month) last[1].push(entry)
      else groups.push([entry.month, [entry]])
    }
    return groups
  }, [history])

  if (byMonth.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
        History
      </p>
      <div className="flex flex-col rounded-3xl border border-slate-200 bg-white px-4 dark:border-[#31343a] dark:bg-[#212327]">
        {byMonth.map(([month, entries]) => {
          const total = entries.reduce((sum, e) => sum + e.amount, 0)
          const isOpen = openMonth === month
          return (
            <div key={month} className="flex flex-col">
              <button
                onClick={() => setOpenMonth(isOpen ? null : month)}
                aria-expanded={isOpen}
                className="flex items-center justify-between border-b border-slate-100 py-3 text-left transition-transform duration-150 active:scale-[0.98] dark:border-[#1e2027] last:border-b-0"
              >
                <span className="font-medium text-slate-900 dark:text-slate-100">{monthLabel(month)}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {currency.format(total)}
                  </span>
                  <IconChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              {isOpen && (
                <ul className="flex flex-col gap-1.5 pb-3">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                    >
                      <span className="truncate">
                        {entry.source} · {names[entry.person - 1]}
                      </span>
                      <span className="tabular-nums">{currency.format(entry.amount)}</span>
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

  return (
    <div className="flex flex-col gap-4 px-4 py-6 lg:mx-auto lg:max-w-3xl">
      <HeaderAction>
        <SegmentedControl
          tone="solid"
          value={section}
          onChange={setSection}
          options={[
            { value: 'bills', label: 'Bills' },
            { value: 'income', label: 'Income' },
          ]}
        />
      </HeaderAction>

      <div className="hidden lg:block">
        <h1 className="mb-2 text-[17px] font-semibold text-slate-900 dark:text-slate-100">Budget</h1>
        <SegmentedControl
          tone="solid"
          value={section}
          onChange={setSection}
          options={[
            { value: 'bills', label: 'Bills' },
            { value: 'income', label: 'Income' },
          ]}
        />
      </div>

      {bills === null || incomes === null || expenses === null ? (
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      ) : (
        <>
          {(section === 'bills' ? bills.length > 0 : incomes.length > 0) && (
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={section === 'bills' ? 'Search bills…' : 'Search income…'}
              className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 transition-shadow focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-[#3a3e45] dark:bg-[#212327] dark:text-slate-100"
            />
          )}

          {section === 'bills' ? (
            <BillsSection bills={bills} query={query} reload={reload} />
          ) : (
            <IncomeSection
              incomes={incomes}
              query={query}
              billsTotal={totalMonthlyBills(bills)}
              monthExpensesTotal={expenses
                .filter((e) => e.date.startsWith(currentMonthKey()))
                .reduce((sum, e) => sum + e.total, 0)}
              reload={reload}
            />
          )}
        </>
      )}
    </div>
  )
}
