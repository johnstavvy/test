import { useState } from 'react'
import type { Category } from '../db'

// User-taught merchant → category rules, checked before the built-in keyword
// map in categorize.ts so a wrong guess (e.g. a local shop not in the map)
// can be corrected once and remembered for every future receipt.
const KEY = 'pecunia-custom-categories'

export interface CategoryRule {
  keyword: string
  category: Category
}

export function getCustomRules(): CategoryRule[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (r): r is CategoryRule => !!r && typeof r.keyword === 'string' && typeof r.category === 'string',
      )
    }
  } catch {
    // fall through to empty
  }
  return []
}

function saveRules(rules: CategoryRule[]) {
  localStorage.setItem(KEY, JSON.stringify(rules))
}

// Wholesale replace, used by backup restore — unlike addCustomRule/removeCustomRule,
// which mutate the existing list, this trusts the caller's list as the full set.
export function setCustomRules(rules: CategoryRule[]) {
  saveRules(rules)
}

export function addCustomRule(keyword: string, category: Category): CategoryRule[] {
  const trimmed = keyword.trim()
  if (!trimmed) return getCustomRules()
  const rules = getCustomRules().filter((r) => r.keyword.toLowerCase() !== trimmed.toLowerCase())
  rules.unshift({ keyword: trimmed, category })
  saveRules(rules)
  return rules
}

export function removeCustomRule(keyword: string): CategoryRule[] {
  const rules = getCustomRules().filter((r) => r.keyword.toLowerCase() !== keyword.toLowerCase())
  saveRules(rules)
  return rules
}

export function useCustomRules() {
  const [rules, setRules] = useState<CategoryRule[]>(() => getCustomRules())

  function add(keyword: string, category: Category) {
    setRules(addCustomRule(keyword, category))
  }

  function remove(keyword: string) {
    setRules(removeCustomRule(keyword))
  }

  // Re-reads from localStorage — needed after something outside this hook's own
  // add/remove calls (e.g. a backup restore) writes the rules directly.
  function refresh() {
    setRules(getCustomRules())
  }

  return { rules, add, remove, refresh }
}
