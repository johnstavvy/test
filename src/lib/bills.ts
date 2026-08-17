import { db, type Bill } from '../db'

export type NewBill = Omit<Bill, 'id' | 'createdAt'>

export function addBill(bill: NewBill) {
  return db.bills.add({ ...bill, createdAt: Date.now() } as Bill)
}

export function updateBill(id: number, changes: Partial<NewBill>) {
  return db.bills.update(id, changes)
}

export function deleteBill(id: number) {
  return db.bills.delete(id)
}

export function listBills() {
  return db.bills.orderBy('dueDay').toArray()
}

export function totalMonthlyBills(bills: Bill[]) {
  return bills.reduce((sum, b) => sum + b.amount, 0)
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
