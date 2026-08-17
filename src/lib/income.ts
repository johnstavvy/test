import { db, type Income } from '../db'

export type NewIncome = Omit<Income, 'id' | 'createdAt'>

export function addIncome(income: NewIncome) {
  return db.incomes.add({ ...income, createdAt: Date.now() } as Income)
}

export function updateIncome(id: number, changes: Partial<NewIncome>) {
  return db.incomes.update(id, changes)
}

export function deleteIncome(id: number) {
  return db.incomes.delete(id)
}

export function listIncomes() {
  return db.incomes.orderBy('payDay').toArray()
}

export function totalMonthlyIncome(incomes: Income[]) {
  return incomes.reduce((sum, i) => sum + i.amount, 0)
}
