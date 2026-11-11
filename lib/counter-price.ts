// Parsing for a supplier's counter-price on a confirmed order.
//
// One item: a bare price — "3.50", "$3.50".
// Several items: one price per line — "1=3.50 2=20" (1-based line numbers, the
// same numbers the shop sees when the bot lists the order).

export interface PricedLine {
  qty: number
  price: number | null
}

export function sumLines(lines: PricedLine[]): number {
  return lines.reduce((sum, l) => sum + (l.price ?? 0) * l.qty, 0)
}

export function parseCounterPrices(text: string, lines: { price: number | null }[]): number[] | null {
  if (!lines.length) return null
  const pairs = [...text.matchAll(/(\d+)\s*[=:]\s*\$?(\d+(?:[.,]\d{1,2})?)/g)]
  if (pairs.length) {
    const out = lines.map(l => l.price ?? 0)
    for (const p of pairs) {
      const idx = Number(p[1]) - 1
      const value = Number(p[2].replace(',', '.'))
      if (idx < 0 || idx >= lines.length || !(value > 0)) return null
      out[idx] = value
    }
    return out
  }
  const nums = [...text.matchAll(/(\d+(?:[.,]\d{1,2})?)/g)].map(m => Number(m[1].replace(',', '.')))
  if (!nums.length || nums.some(n => !(n > 0))) return null
  if (lines.length === 1) return [nums[0]]
  if (nums.length === lines.length) return nums
  return null
}
