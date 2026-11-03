// S18.2 typed order intake: the buyer writes "2 bread, 1 cake" and the bot
// matches each pair against supplier catalogues (per-shop or across ALL
// active suppliers) before showing a verify-then-send summary. Pure module —
// no I/O — so the battery can drive it directly.

export interface OrderPair {
  qty: number
  term: string
}

export interface ShelfItem {
  id: string
  name: string
  price: number | null
}

export interface MatchedLine {
  item: ShelfItem
  qty: number
  score: number
}

export interface ShelfSupplier {
  businessId: string
  businessName: string
  supplierDigits: string
  city: string | null
  items: ShelfItem[]
}

export interface MatchResult {
  // Matched lines grouped per supplier, cheapest supplier wins a term tie.
  groups: { supplier: ShelfSupplier; lines: MatchedLine[] }[]
  unmatched: OrderPair[]
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'some', 'any', 'my', 'and', 'with', 'please', 'pls', 'just'])
const MAX_FRAGMENTS = 10
const MAX_TERM_LEN = 40

/** Parse a typed order line into qty+term pairs ("2 bread, 1 cake",
 * "bread x2 and 1 cake", bare "bread" all work). Unknown fragments are
 * surfaced as junk so the caller can correct the buyer gently. */
/** Parse one fragment ("2 bread", "bread x2", "2 bread 3 scones") into
 * qty+term pairs via a tiny token scan — spaces between pairs are natural. */
function parseFrag(frag: string): { pairs: OrderPair[]; junk: boolean } {
  const tokens = frag.split(/\s+/).filter(Boolean)
  const pairs: OrderPair[] = []
  let qty = 1
  let name: string[] = []

  const flush = () => {
    const term = name.join(' ').trim()
    if (term) pairs.push({ qty, term })
    qty = 1
    name = []
  }

  for (const tok of tokens) {
    // plain digits, "2x" or "x2" — the qty of the NEXT (or current) item
    const d = tok.match(/^(?:\d{1,3}x|x\d{1,3}|\d{1,3})$/i)
    if (d) {
      const val = Number(tok.replace(/[xX]/g, ''))
      if (name.length) {
        // "bread x2": the qty belongs to the item being built — remember it
        if (/x/i.test(tok)) qty = val
        else flush()
      }
      if (!name.length) qty = val
      continue
    }
    if (/^[a-zA-Z][\w'-]*$/.test(tok)) {
      if (!STOP_WORDS.has(tok.toLowerCase())) name.push(tok.toLowerCase())
      continue
    }
    // stray punctuation-only tokens are ignored; anything else relaxes to
    // its alphanumeric core so "½-bags" still scans
    const core = tok.replace(/[^a-z0-9]/gi, '')
    if (core && core !== tok && /[a-zA-Z]/.test(core)) name.push(core.toLowerCase())
    else if (core && !/[a-zA-Z]/.test(core)) {
      if (name.length) flush()
      qty = Number(core)
    }
  }
  flush()
  return { pairs, junk: pairs.length === 0 }
}

export function parseOrderLine(text: string): { pairs: OrderPair[]; junk: string[] } {
  const work = (text || '')
    .replace(/[*_`]/g, ' ')
    .replace(/\b(?:order|buy|get|want|for)\b/ig, ' ')
  const fragments = work
    .split(/[,;/]|\s+and\s+|\s+&\s+/i)
    .map(f => f.trim())
    .filter(Boolean)
    .slice(0, MAX_FRAGMENTS)

  const pairs: OrderPair[] = []
  const junk: string[] = []

  for (const frag of fragments) {
    const { pairs: fp, junk: j } = parseFrag(frag)
    for (const p of fp) {
      if (p.term.length < 2 || p.term.length > MAX_TERM_LEN) continue
      pairs.push({ ...p, qty: Math.max(1, Math.min(99, p.qty)) })
    }
    if (j && fp.length === 0) junk.push(frag)
  }
  return { pairs, junk }
}

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sing(token: string): string {
  // Very light de-pluralizer, good enough for catalogue names.
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2)
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

function normTokens(s: string): string[] {
  const raw = norm(s).split(' ').filter(t => t && !STOP_WORDS.has(t))
  const out: string[] = []
  for (const t of raw) {
    out.push(t)
    out.push(sing(t))
  }
  return [...new Set(out)].filter(Boolean)
}

function scoreTerm(term: string, itemName: string): number {
  const t = norm(term)
  const n = norm(itemName)
  if (!t || !n) return 0
  if (t === n) return 100
  // decisive prefix wins ("cake" → "Bite Cake", "scones" → "Plain Scones")
  if (n.startsWith(`${t} `) || n.startsWith(t) || new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(n)) {
    const tTok = normTokens(t)
    const nTok = normTokens(n)
    const shared = tTok.filter(x => nTok.includes(x)).length
    return 50 + shared
  }
  const tTok = normTokens(t)
  const nTok = normTokens(n)
  const shared = tTok.filter(x => nTok.includes(x)).length
  if (shared >= 1) return shared
  return 0
}

/**
 * Match parsed pairs to supplier shelves. Terms prefer the given shop first
 * (its shelf is passed as explicitSupplier when the buyer is already looking
 * at a business), otherwise the best-scoring item across all suppliers wins.
 */
export function matchOrder(
  pairs: OrderPair[],
  suppliers: ShelfSupplier[],
  explicitSupplierId?: string
): MatchResult {
  const buckets = new Map<string, { supplier: ShelfSupplier; lines: MatchedLine[] }>()
  const unmatched: OrderPair[] = []

  for (const pair of pairs) {
    let best: { supplier: ShelfSupplier; item: ShelfItem; score: number } | null = null
    for (const sup of suppliers) {
      // Explicit-shop terms always outrank cross-shelf matches of equal score.
      const bump = explicitSupplierId && sup.businessId === explicitSupplierId ? 15 : 0
      for (const item of sup.items) {
        const score = scoreTerm(pair.term, item.name) + bump
        if (score <= 0) continue
        if (!best || score > best.score) {
          best = { supplier: sup, item, score }
          continue
        }
        if (score === best.score) {
          // Deterministic ties: the cheaper item (then alphabetical shop)
          // wins, so no-supplier-context matches stay stable.
          const a = item.price ?? Number.MAX_SAFE_INTEGER
          const b = best.item.price ?? Number.MAX_SAFE_INTEGER
          if (a < b || (a === b && sup.businessName.localeCompare(best.supplier.businessName) < 0)) {
            best = { supplier: sup, item, score }
          }
        }
      }
    }
    if (!best) {
      unmatched.push(pair)
      continue
    }
    let bucket = buckets.get(best.supplier.businessId)
    if (!bucket) {
      bucket = { supplier: best.supplier, lines: [] }
      buckets.set(best.supplier.businessId, bucket)
    }
    bucket.lines.push({ item: best.item, qty: pair.qty, score: best.score })
  }

  return { groups: [...buckets.values()], unmatched }
}

/** Group label for the split summary: how many shops the order spans. */
export function matchStat(groups: MatchResult['groups']): { shops: number; items: number } {
  return { shops: groups.length, items: groups.reduce((s, g) => s + g.lines.length, 0) }
}
