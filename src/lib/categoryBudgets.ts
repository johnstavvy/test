import { useState } from 'react'
import type { Category } from '../db'

// Per-category monthly spending caps, set in Settings and shown as progress
// bars in Summary's "By Category" section. A category with no entry here has
// no cap and falls back to the existing uncapped bar-chart display.
const KEY = 'pecunia-category-budgets'

export type CategoryBudgets = Partial<Record<Category, number>>

export function getCategoryBudgets(): CategoryBudgets {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: CategoryBudgets = {}
      for (const [category, amount] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) {
          out[category as Category] = amount
        }
      }
      return out
    }
  } catch {
    // fall through to empty
  }
  return {}
}

// Wholesale replace, used by backup restore.
export function setCategoryBudgets(budgets: CategoryBudgets) {
  localStorage.setItem(KEY, JSON.stringify(budgets))
}

export function setCategoryBudget(category: Category, amount: number | undefined) {
  const budgets = getCategoryBudgets()
  if (amount === undefined || amount <= 0) delete budgets[category]
  else budgets[category] = amount
  setCategoryBudgets(budgets)
  return budgets
}

export function useCategoryBudgets() {
  const [budgets, setBudgets] = useState<CategoryBudgets>(() => getCategoryBudgets())

  function set(category: Category, amount: number | undefined) {
    setBudgets(setCategoryBudget(category, amount))
  }

  // Re-reads from localStorage — needed after a backup restore writes directly.
  function refresh() {
    setBudgets(getCategoryBudgets())
  }

  return { budgets, set, refresh }
}
