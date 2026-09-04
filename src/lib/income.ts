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
    const current = await db.incomes.get(id)
    if (current && current.amount > 0 && effectiveIncomeAmount(current) === 0) {
      await snapshotHistory(current)
    }
  }
  return db.incomes.update(id, { ...changes, updatedAt: Date.now() })
}

// Upserts (not just adds) per incomeId+month so correcting a typo mid-month never creates
// a second history row for the same month — only the month the value actually belonged to.
async function snapshotHistory(income: Income) {
  const month = monthKeyOf(new Date(income.updatedAt ?? income.createdAt))
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

export function listIncomes() {
  return db.incomes.orderBy('payDay').toArray()
}

export function totalMonthlyIncome(incomes: Income[]) {
  return incomes.reduce((sum, i) => sum + effectiveIncomeAmount(i), 0)
}

// Past months' actual income, newest first — grouped/rendered by the caller.
export function listIncomeHistory() {
  return db.incomeHistory.orderBy('month').reverse().toArray()
}
