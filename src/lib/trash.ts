import { db, type Bill, type Expense, type Income, type TrashEntry, type TrashType } from '../db'

export function addToTrash(type: TrashType, data: Expense | Bill | Income) {
  return db.trash.add({ type, deletedAt: Date.now(), data } as TrashEntry)
}

export function removeFromTrash(id: number) {
  return db.trash.delete(id)
}

export function listTrash() {
  return db.trash.orderBy('deletedAt').reverse().toArray()
}

export function clearTrash() {
  return db.trash.clear()
}

// Writes the trashed record back into its original table (preserving its
// original id via put) and removes the trash entry.
export async function restoreFromTrash(entry: TrashEntry) {
  if (entry.type === 'expense') await db.expenses.put(entry.data as Expense)
  else if (entry.type === 'bill') await db.bills.put(entry.data as Bill)
  else await db.incomes.put(entry.data as Income)
  await db.trash.delete(entry.id)
}
