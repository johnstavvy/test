import { guessCategory } from './categorize'
import type { Category } from '../db'

export interface ParsedReceipt {
  merchant: string
  date: string // ISO yyyy-mm-dd, defaults to today if not found
  total: number
  category: Category
}

const SUBTOTAL_LINE = /subtotal/i
const TOTAL_LINE = /\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|total)\b/i
const MONEY = /\$?\s*(\d{1,3}(?:[,.\s]\d{3})*(?:\.\d{2})|\d+\.\d{2})/

const DATE_PATTERNS: RegExp[] = [
  /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, // yyyy-mm-dd
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/, // mm/dd/yyyy
  /\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/, // mm-dd-yyyy
]

function toIsoDate(raw: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const m = raw.match(pattern)
    if (!m) continue
    if (pattern === DATE_PATTERNS[0]) {
      const [, y, mo, d] = m
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    let [, a, b, y] = m
    if (y.length === 2) y = `20${y}`
    const mo = a.padStart(2, '0')
    const d = b.padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return null
}

function parseMoney(raw: string): number | null {
  const m = raw.match(MONEY)
  if (!m) return null
  const cleaned = m[1].replace(/[,\s](?=\d{3})/g, '')
  const value = parseFloat(cleaned)
  return Number.isFinite(value) ? value : null
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // Merchant: first line that looks like a name (letters, not just numbers/symbols)
  const merchant =
    lines.find((l) => /[a-zA-Z]{3,}/.test(l) && !/receipt|invoice/i.test(l)) ?? 'Unknown Merchant'

  // Date: search all lines for a date pattern
  let date: string | null = null
  for (const line of lines) {
    date = toIsoDate(line)
    if (date) break
  }

  // Total: prefer a line matching total keywords, else the largest money value found
  let total: number | null = null
  for (const line of lines) {
    if (SUBTOTAL_LINE.test(line)) continue
    if (TOTAL_LINE.test(line)) {
      const value = parseMoney(line)
      if (value !== null) {
        total = value
        break
      }
    }
  }
  if (total === null) {
    const amounts = lines
      .map((l) => parseMoney(l))
      .filter((v): v is number => v !== null)
    if (amounts.length) total = Math.max(...amounts)
  }

  return {
    merchant: merchant.slice(0, 80),
    date: date ?? new Date().toISOString().slice(0, 10),
    total: total ?? 0,
    category: guessCategory(text),
  }
}
