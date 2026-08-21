import Dexie, { type EntityTable } from 'dexie'

// Built-in defaults, covering day-to-day/variable spending; fixed recurring costs
// (rent, insurance, utilities-as-a-bill) live in BILL_CATEGORIES instead. The six
// added after Travel (Personal Care through Fees & Charges) round the list out to
// match the major discretionary-spending groups in BLS's Consumer Expenditure
// Survey. Users can add more from Settings — see lib/userCategories.ts, whose
// getAllCategories() (built-ins + user-added) is the list every category picker
// in the app should render, not this array directly.
export const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Utilities',
  'Health',
  'Entertainment',
  'Travel',
  'Personal Care',
  'Home & Garden',
  'Pets',
  'Education',
  'Gifts & Donations',
  'Fees & Charges',
  'Other',
] as const

// A plain string, not a literal union — user-added categories (lib/userCategories.ts)
// can't be known at compile time, so the type can't be pinned to CATEGORIES anymore.
export type Category = string

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
  'Car Payment',
  'Auto Insurance',
  'Fuel',
  'Maintenance',
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
  autoPay?: boolean // charged automatically — once past due, sorts to the bottom of its group and self-marks paid
  notes: string
  createdAt: number
  updatedAt?: number // last time the amount was edited; used to auto-zero stale non-recurring bills after their due day
  paidMonths?: string[] // "yyyy-mm" keys the user has marked this bill paid for; resets implicitly each new month
  autoPaySyncedMonths?: string[] // "yyyy-mm" keys already auto-marked paid by autoPay, so a manual uncheck afterward sticks for the rest of that month
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

export type TrashType = 'expense' | 'bill' | 'income'

export interface TrashEntry {
  id: number
  type: TrashType
  deletedAt: number
  data: Expense | Bill | Income
}

export const db = new Dexie('expense-tracker') as Dexie & {
  expenses: EntityTable<Expense, 'id'>
  bills: EntityTable<Bill, 'id'>
  incomes: EntityTable<Income, 'id'>
  trash: EntityTable<TrashEntry, 'id'>
}

db.version(1).stores({
  expenses: '++id, date, category, merchant, createdAt',
})

db.version(2).stores({
  expenses: '++id, date, category, merchant, createdAt',
  bills: '++id, dueDay, category, name, createdAt',
  incomes: '++id, payDay, source, createdAt',
})

db.version(3).stores({
  expenses: '++id, date, category, merchant, createdAt',
  bills: '++id, dueDay, category, name, createdAt',
  incomes: '++id, payDay, source, createdAt',
  trash: '++id, type, deletedAt',
})
