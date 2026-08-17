// Whether an entry repeats every month; missing/legacy rows default to true (recurring is the norm).
export function isRecurring(entity: { recurring?: boolean }): boolean {
  return entity.recurring !== false
}
