import { db, type Expense } from '../db'

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>

export function addExpense(expense: NewExpense) {
  return db.expenses.add({ ...expense, createdAt: Date.now() } as Expense)
}

export function updateExpense(id: number, changes: Partial<NewExpense>) {
  return db.expenses.update(id, changes)
}

export function deleteExpense(id: number) {
  return db.expenses.delete(id)
}

export function listExpenses() {
  return db.expenses.orderBy('date').reverse().toArray()
}

export function totalsByCategory(expenses: Expense[]) {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.total)
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

export function totalsByMonth(expenses: Expense[]) {
  const totals = new Map<string, number>()
  for (const e of expenses) {
    const key = e.date.slice(0, 7) // yyyy-mm
    totals.set(key, (totals.get(key) ?? 0) + e.total)
  }
  return [...totals.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month < b.month ? 1 : -1))
}
