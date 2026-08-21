import { useState } from 'react'
import { CATEGORIES, type Category } from '../db'

// User-added expense categories, set in Settings — extends the built-in
// CATEGORIES list at runtime. Distinct from customCategories.ts, which stores
// merchant-keyword → category *rules*, not category names themselves.
const KEY = 'pecunia-user-categories'

export function getUserCategories(): Category[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) {
      return parsed.filter((c): c is Category => typeof c === 'string' && c.trim() !== '')
    }
  } catch {
    // fall through to empty
  }
  return []
}

// Wholesale replace, used by backup restore.
export function setUserCategories(categories: Category[]) {
  localStorage.setItem(KEY, JSON.stringify(categories))
}

// Built-ins first (in their existing order), then user-added ones in the order
// added — this is the list every category `<select>`/filter in the app should
// render, instead of the CATEGORIES constant directly.
export function getAllCategories(): Category[] {
  return [...CATEGORIES, ...getUserCategories()]
}

export function addUserCategory(name: string): Category[] {
  const trimmed = name.trim()
  if (!trimmed) return getUserCategories()
  const exists = getAllCategories().some((c) => c.toLowerCase() === trimmed.toLowerCase())
  if (exists) return getUserCategories()
  const categories = [...getUserCategories(), trimmed]
  setUserCategories(categories)
  return categories
}

export function removeUserCategory(name: string): Category[] {
  const categories = getUserCategories().filter((c) => c !== name)
  setUserCategories(categories)
  return categories
}

export function useCategories() {
  const [extra, setExtra] = useState<Category[]>(() => getUserCategories())

  function add(name: string) {
    setExtra(addUserCategory(name))
  }

  function remove(name: string) {
    setExtra(removeUserCategory(name))
  }

  // Re-reads from localStorage — needed after a backup restore writes directly.
  function refresh() {
    setExtra(getUserCategories())
  }

  return { categories: [...CATEGORIES, ...extra], userCategories: extra, add, remove, refresh }
}
