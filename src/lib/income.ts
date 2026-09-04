import { db, type Income, type IncomeHistoryEntry } from '../db'
import { isRecurring } from './recurring'
import { dayDateThisMonth, isPastDayThisMonth, monthKeyOf } from './week'

export type NewIncome = Omit<Income, 'id' | 'createdAt'>

export function addIncome(income: NewIncome) {
  const now = Date.now()
  return db.incomes.add({ ...income, createdAt: now, updatedAt: now } as Income)
}

// Recurring income auto-zeros the day after its pay day passes each month — a cue to type
// in the new month's actual amount rather than silently carrying last month's figure
// forward. Unlike bills' auto-zero (non-recurring only), this applies to every recurring
// row, since resetting every pay cycle is the whole point here. The prior month's real
// amount isn't lost: updateIncome() snapshots it into incomeHistory just before the
// overwrite that re-arms this record for the new month.
export function effectiveIncomeAmount(income: Income, today = new Date()): number {
  if (!isRecurring(income)) return income.amount
  if (!isPastDayThisMonth(income.payDay, today)) return income.amount
  const lastTouched = income.updatedAt ?? income.createdAt
  return lastTouched < dayDateThisMonth(income.payDay, today).getTime() ? 0 : income.amount
}

export async function updateIncome(id: number, changes: Partial<NewIncome>) {
  if (changes.amount !== undefined) {
    // Read-check-write on incomeHistory, so this has to run inside one transaction — two
    // overlapping calls (e.g. React StrictMode's double-invoked effects) would otherwise both
    // see "no existing snapshot" and each insert their own, duplicating the history row.
    await db.transaction('rw', db.incomes, db.incomeHistory, async () => {
      const current = await db.incomes.get(id)
      if (current && current.amount > 0 && effectiveIncomeAmount(current) === 0) {
        await snapshotHistory(current, monthKeyOf(new Date(current.updatedAt ?? current.createdAt)))
      }
    })
  }
  return db.incomes.update(id, { ...changes, updatedAt: Date.now() })
}

// Upserts (not just adds) per incomeId+month so correcting a typo mid-month never creates
// a second history row for the same month — only the month the value actually belonged to.
async function snapshotHistory(income: Income, month: string) {
  const existing = await db.incomeHistory.where('incomeId').equals(income.id).and((e) => e.month === month).first()
  const entry: Omit<IncomeHistoryEntry, 'id'> = {
    incomeId: income.id,
    source: income.source,
    person: income.person === 2 ? 2 : 1,
    month,
    amount: income.amount,
    recordedAt: Date.now(),
  }
  if (existing) await db.incomeHistory.update(existing.id, entry)
  else await db.incomeHistory.add(entry as IncomeHistoryEntry)
}

export function deleteIncome(id: number) {
  return db.incomes.delete(id)
}

// One-time income (this app's real usage pattern: a fresh entry per irregular paycheck,
// rather than one persistent recurring row) has no ongoing record to auto-zero in place —
// once the calendar month it was logged in has passed, it's archived into incomeHistory
// outright and removed from the live list, so a new month always starts empty and ready
// for fresh entries. Recurring income is unaffected; it keeps the separate in-place
// auto-zero handled by effectiveIncomeAmount()/updateIncome() above.
async function archiveStaleOneTimeIncome(today = new Date()) {
  const currentMonth = monthKeyOf(today)
  // One transaction for the whole scan+archive: this runs on every listIncomes() call (every
  // page load), so two overlapping calls are routine (React StrictMode's double-invoked
  // effects hit this every time in dev) — without a shared transaction, both would read the
  // same stale rows before either deletes them, and each archive+delete its own copy,
  // duplicating history entries. IndexedDB serializes same-store 'rw' transactions, so the
  // second call's scan won't start until the first's deletes have already committed.
  await db.transaction('rw', db.incomes, db.incomeHistory, async () => {
    const all = await db.incomes.toArray()
    const stale = all.filter((i) => !isRecurring(i) && monthKeyOf(new Date(i.createdAt)) !== currentMonth)
    for (const income of stale) {
      await snapshotHistory(income, monthKeyOf(new Date(income.createdAt)))
      await db.incomes.delete(income.id)
    }
  })
}

export async function listIncomes() {
  await archiveStaleOneTimeIncome()
  return db.incomes.orderBy('payDay').toArray()
}

export function totalMonthlyIncome(incomes: Income[]) {
  return incomes.reduce((sum, i) => sum + effectiveIncomeAmount(i), 0)
}

// Past months' actual income, newest first — grouped/rendered by the caller.
export function listIncomeHistory() {
  return db.incomeHistory.orderBy('month').reverse().toArray()
}
