import type { Category } from '../db'

const KEYWORD_MAP: Array<[Category, RegExp]> = [
  ['Groceries', /grocery|market|supermarket|whole foods|trader joe|safeway|kroger|aldi|costco/i],
  ['Dining', /restaurant|cafe|coffee|starbucks|pizza|grill|diner|bar\b|kitchen|bistro|eatery|mcdonald|chipotle/i],
  ['Transport', /uber|lyft|taxi|transit|gas station|fuel|shell|chevron|exxon|parking|metro/i],
  ['Shopping', /target|walmart|amazon|mall|store|shop|apparel|clothing|best buy/i],
  ['Utilities', /electric|water bill|utility|internet|comcast|verizon|at&t|phone bill/i],
  ['Health', /pharmacy|clinic|hospital|cvs|walgreens|doctor|dental/i],
  ['Entertainment', /cinema|movie|theatre|theater|netflix|spotify|concert|tickets/i],
  ['Travel', /airlines|airline|hotel|motel|airbnb|flight|rental car/i],
]

export function guessCategory(text: string): Category {
  for (const [category, pattern] of KEYWORD_MAP) {
    if (pattern.test(text)) return category
  }
  return 'Other'
}
