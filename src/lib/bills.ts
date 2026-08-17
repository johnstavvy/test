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
