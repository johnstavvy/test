import { db, type Bill, type Expense, type Income } from '../db'
import { getPeopleNames, setPersonName } from './people'
import { getCustomRules, setCustomRules, type CategoryRule } from './customCategories'
import { getStoredNavOrder, setStoredNavOrder } from './navOrder'
import { getStoredTheme, setStoredTheme } from './theme'

const BACKUP_VERSION = 2

export interface BackupData {
  version: number
  exportedAt: string
  expenses: Expense[]
  bills: Bill[]
  incomes: Income[]
  people: [string, string]
  // Added in v2 — previously these localStorage-only settings (in particular,
  // learned category rules) silently vanished when restoring onto a new device.
  customCategoryRules?: CategoryRule[]
  navOrder?: string[]
  theme?: 'light' | 'dark'
}

export async function exportData(): Promise<BackupData> {
  const [expenses, bills, incomes] = await Promise.all([
    db.expenses.toArray(),
    db.bills.toArray(),
    db.incomes.toArray(),
  ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    expenses,
    bills,
    incomes,
    people: getPeopleNames(),
    customCategoryRules: getCustomRules(),
    navOrder: getStoredNavOrder(),
    theme: getStoredTheme(),
  }
}

export function downloadBackup(data: BackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pecunia-backup-${data.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseBackupFile(text: string): BackupData {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as BackupData).expenses) ||
    !Array.isArray((parsed as BackupData).bills) ||
    !Array.isArray((parsed as BackupData).incomes)
  ) {
    throw new Error("That doesn't look like a Pecunia backup file.")
  }
  return parsed as BackupData
}

function stripId<T extends { id: number }>(row: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = row
  return rest
}

// Replaces all on-device data with the contents of a backup. Destructive by
// design (this is a "restore" flow, not a merge) — the caller is responsible
// for confirming with the user before calling this.
export async function restoreBackup(data: BackupData) {
  await db.transaction('rw', db.expenses, db.bills, db.incomes, async () => {
    await db.expenses.clear()
    await db.bills.clear()
    await db.incomes.clear()
    if (data.expenses.length) await db.expenses.bulkAdd(data.expenses.map(stripId) as Expense[])
    if (data.bills.length) await db.bills.bulkAdd(data.bills.map(stripId) as Bill[])
    if (data.incomes.length) await db.incomes.bulkAdd(data.incomes.map(stripId) as Income[])
  })
  if (data.people) {
    setPersonName(0, data.people[0])
    setPersonName(1, data.people[1])
  }
  if (data.customCategoryRules) setCustomRules(data.customCategoryRules)
  if (data.navOrder) setStoredNavOrder(data.navOrder)
  if (data.theme) setStoredTheme(data.theme)
}
