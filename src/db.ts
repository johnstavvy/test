import Dexie, { type EntityTable } from 'dexie'

export const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Utilities',
  'Health',
  'Entertainment',
  'Travel',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Expense {
  id: number
  merchant: string
  date: string // ISO yyyy-mm-dd
  total: number
  category: Category
  rawText: string
  imageDataUrl: string
  createdAt: number
}

export const db = new Dexie('expense-tracker') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
}

db.version(1).stores({
  expenses: '++id, date, category, merchant, createdAt',
})
