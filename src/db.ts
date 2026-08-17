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
  recurring?: boolean // repeats every month; missing/legacy rows default to true (one-time bills are the exception)
  notes: string
  createdAt: number
  updatedAt?: number // last time the amount was edited; used to auto-zero stale non-recurring bills after their due day
}

export interface Income {
  id: number
  source: string
  amount: number
  payDay: number // day of month, 1-31
  person?: 1 | 2 // which household member this income belongs to; missing on legacy rows, treat as 1
  recurring?: boolean // repeats every month; missing/legacy rows default to true (one-time income is the exception)
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
