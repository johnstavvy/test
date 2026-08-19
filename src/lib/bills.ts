import { db, type Bill } from '../db'
import { isRecurring } from './recurring'

export type NewBill = Omit<Bill, 'id' | 'createdAt'>

export function addBill(bill: NewBill) {
  const now = Date.now()
  return db.bills.add({ ...bill, createdAt: now, updatedAt: now } as Bill)
}

export function updateBill(id: number, changes: Partial<NewBill>) {
  return db.bills.update(id, { ...changes, updatedAt: Date.now() })
}

export function deleteBill(id: number) {
  return db.bills.delete(id)
}

export function listBills() {
  return db.bills.orderBy('dueDay').toArray()
}

// Midnight of this bill's due day in the current month, clamped to the month's length.
export function dueDateThisMonth(dueDay: number, today = new Date()) {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const due = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, daysInMonth))
  due.setHours(0, 0, 0, 0)
  return due
}

// Non-recurring bills (e.g. a variable electric/gas/water bill) auto-zero the day after their
// due date passes, as long as the amount hasn't been re-entered since — a nudge to plug in the
// new amount once the next bill arrives, without deleting the entry or losing its due day/category.
export function effectiveAmount(bill: Bill, today = new Date()) {
  if (isRecurring(bill)) return bill.amount
  const due = dueDateThisMonth(bill.dueDay, today)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const lastTouched = bill.updatedAt ?? bill.createdAt
  return start > due && lastTouched < due.getTime() ? 0 : bill.amount
}

export function totalMonthlyBills(bills: Bill[]) {
  return bills.reduce((sum, b) => sum + effectiveAmount(b), 0)
}

function monthKey(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

export function isBillPaidThisMonth(bill: Bill, today = new Date()) {
  return bill.paidMonths?.includes(monthKey(today)) ?? false
}

// Toggling paid doesn't touch `amount`/`updatedAt` — it's independent of the
// auto-zero mechanism above, just a per-month checkmark for household tracking.
export function setBillPaidThisMonth(bill: Bill, paid: boolean, today = new Date()) {
  const key = monthKey(today)
  const months = bill.paidMonths ?? []
  const next = paid ? (months.includes(key) ? months : [...months, key]) : months.filter((m) => m !== key)
  return db.bills.update(bill.id, { paidMonths: next })
}

// Days until the next occurrence of a day-of-month due date, clamped to
// the last day of shorter months (e.g. dueDay 31 in April -> Apr 30).
export function daysUntilDue(dueDay: number, today = new Date()) {
  const clampedThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  let next = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, clampedThisMonth))
  next.setHours(0, 0, 0, 0)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (next < start) {
    const clampedNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()
    next = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay, clampedNextMonth))
  }

  return Math.round((next.getTime() - start.getTime()) / 86_400_000)
}

// Formats a day-of-month as "1st", "2nd", "3rd", "4th", ... "11th", "21st", etc.
export function ordinal(n: number): string {
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return `${n}st`
  if (j === 2 && k !== 12) return `${n}nd`
  if (j === 3 && k !== 13) return `${n}rd`
  return `${n}th`
}

export function dueLabel(days: number, dueDay: number) {
  const day = ordinal(dueDay)
  if (days === 0) return `Due today · the ${day}`
  if (days === 1) return `Due tomorrow · the ${day}`
  return `Due the ${day} · in ${days}d`
}
