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

export const BILL_CATEGORIES = [
  'Mortgage/Rent',
  'Electricity',
  'Gas',
  'Water',
  'Internet',
  'Subscription',
  'Insurance',
  'Other',
] as const

export type BillCategory = (typeof BILL_CATEGORIES)[number]

export interface Bill {
  id: number
  name: string
  category: BillCategory
  amount: number
  dueDay: number // day of month, 1-31
  person?: 1 | 2 // which household member this subscription belongs to; unused for non-subscription bills
  paymentSource?: string // e.g. "Chase Checking", "Amex Blue" — which bank/card this is paid from
  notes: string
  createdAt: number
}

export interface Income {
  id: number
  source: string
  amount: number
  payDay: number // day of month, 1-31
  person?: 1 | 2 // which household member this income belongs to; missing on legacy rows, treat as 1
  notes: string
  createdAt: number
}

export const db = new Dexie('expense-tracker') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
  bills: EntityTable<Bill, 'id'>
  incomes: EntityTable<Income, 'id'>
}

db.version(1).stores({
  expenses: '++id, date, category, merchant, createdAt',
})

db.version(2).stores({
  expenses: '++id, date, category, merchant, createdAt',
  bills: '++id, dueDay, category, name, createdAt',
  incomes: '++id, payDay, source, createdAt',
})
