export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function dateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Monday (ISO yyyy-mm-dd) of the calendar week containing the given date.
export function mondayOf(iso: string): string {
  const d = dateFromIso(iso)
  const day = d.getDay() // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  return isoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff))
}

// The 7 ISO dates (Mon..Sun) of the current calendar week.
export function currentWeekDays(): string[] {
  const monday = dateFromIso(mondayOf(isoDate(new Date())))
  return Array.from({ length: 7 }, (_, i) =>
    isoDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)),
  )
}

// "yyyy-mm" key for the calendar month a date falls in (matches Expense.date's yyyy-mm-dd prefix).
export function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
