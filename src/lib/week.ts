// Local calendar date as "yyyy-mm-dd" — deliberately NOT toISOString(), which
// converts to UTC first and can silently roll over to the wrong calendar day
// depending on timezone and time of day (e.g. evenings in US timezones).
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
