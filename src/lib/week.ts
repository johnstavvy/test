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

// "yyyy-mm" key for the calendar month a date falls in.
export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// "yyyy-mm" key for the current calendar month (matches Expense.date's yyyy-mm-dd prefix).
export function currentMonthKey(): string {
  return monthKeyOf(new Date())
}

// "August 2026" from a "yyyy-mm" key.
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Midnight of the given day-of-month in today's calendar month, clamped to the month's
// length (e.g. day 31 in April -> Apr 30). Shared by any monthly-recurring due/pay-day math.
export function dayDateThisMonth(day: number, today = new Date()): Date {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const d = new Date(today.getFullYear(), today.getMonth(), Math.min(day, daysInMonth))
  d.setHours(0, 0, 0, 0)
  return d
}

// True starting the day after the given day-of-month has passed in the current calendar month.
export function isPastDayThisMonth(day: number, today = new Date()): boolean {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return start > dayDateThisMonth(day, today)
}

// "Today" / "Yesterday" / "Aug 24" — the human date formatter shared by any list
// that groups or labels items by day.
export function humanDayLabel(iso: string): string {
  const today = isoDate(new Date())
  if (iso === today) return 'Today'
  const t = dateFromIso(today)
  const yesterday = isoDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1))
  if (iso === yesterday) return 'Yesterday'
  return dateFromIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
