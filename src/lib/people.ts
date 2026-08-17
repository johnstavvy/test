const KEY = 'pecunia-income-people'
const DEFAULT_NAMES: [string, string] = ['Me', 'Partner']

export function getPeopleNames(): [string, string] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.length === 2 && parsed.every((n) => typeof n === 'string')) {
      return parsed as [string, string]
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_NAMES
}

export function setPersonName(index: 0 | 1, name: string) {
  const names = getPeopleNames()
  names[index] = name.trim() || DEFAULT_NAMES[index]
  localStorage.setItem(KEY, JSON.stringify(names))
  return names
}
