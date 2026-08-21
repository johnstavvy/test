import type { Category } from '../db'
import { getCustomRules } from './customCategories'

const KEYWORD_MAP: Array<[Category, RegExp]> = [
  ['Groceries', /grocery|market|supermarket|whole foods|trader joe|safeway|kroger|aldi|costco/i],
  ['Dining', /restaurant|cafe|coffee|starbucks|pizza|grill|diner|bar\b|kitchen|bistro|eatery|mcdonald|chipotle/i],
  ['Transport', /uber|lyft|taxi|transit|gas station|fuel|shell|chevron|exxon|parking|metro/i],
  ['Shopping', /target|walmart|amazon|mall|store|shop|apparel|clothing|best buy/i],
  ['Utilities', /electric|water bill|utility|internet|comcast|verizon|at&t|phone bill/i],
  ['Health', /pharmacy|clinic|hospital|cvs|walgreens|doctor|dental/i],
  ['Entertainment', /cinema|movie|theatre|theater|netflix|spotify|concert|tickets/i],
  ['Travel', /airlines|airline|hotel|motel|airbnb|flight|rental car/i],
  ['Personal Care', /salon|barber|\bspa\b|\bnail\b|haircut|cosmetic|sephora|ulta|\bgym\b|fitness/i],
  ['Home & Garden', /home depot|lowe's|lowes|hardware|furniture|ikea|nursery|garden center|hobby lobby/i],
  ['Pets', /\bpet\b|petco|petsmart|\bvet\b|veterinary|dog groom/i],
  ['Education', /tuition|school|university|college|textbook|\bcourse\b|udemy/i],
  ['Gifts & Donations', /donation|charity|gofundme|gift shop|florist/i],
  ['Fees & Charges', /\boverdraft\b|late fee|service fee|atm fee|bank fee|finance charge/i],
]

export function guessCategory(text: string): Category {
  const lower = text.toLowerCase()
  for (const rule of getCustomRules()) {
    if (lower.includes(rule.keyword.toLowerCase())) return rule.category
  }
  for (const [category, pattern] of KEYWORD_MAP) {
    if (pattern.test(text)) return category
  }
  return 'Other'
}
