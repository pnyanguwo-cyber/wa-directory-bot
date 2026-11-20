// lib/semantic-search.ts — vector recall for WhatsApp photo search.
//
// A customer's photo is described by the vision model, that description is
// embedded with the same model the webapp stores products with, and
// match_business_items() returns the nearest shelf items by cosine similarity.
// This is what finds a "ladies tote" listing from a picture of a handbag when
// the customer never types the word.
//
// Optional by design, exactly like the webapp: no key, no migration, a timeout
// or a bad response all return null so the caller keeps its keyword flow.

import { getSupabase } from '@wa-directory/shared'

export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
// Matches business_items.embedding vector(768) in migration 034. Product
// vectors are stored at this width, so query vectors must match.
export const EMBEDDING_DIMENSIONS = 768
// Calibrated on THIS catalogue, not inherited from the webapp's 0.70 (tuned on
// product listings). Measured with vision-style descriptions against the live
// shelf: correct matches scored 0.61-0.69 ("burst pipe" → Standalone Leak
// Repair 0.613, "fresh loaves" → White Bread Loaf 0.687) while unrelated
// pictures scored 0.57-0.59 (handbag → Cement Bag 0.571). 0.60 sits in that gap.
export const SEMANTIC_MIN_SIMILARITY = 0.6

const EMBEDDING_TIMEOUT_MS = 8_000

/** Truncated embeddings must be re-normalised before cosine distance is meaningful. */
function l2Normalize(values: number[]): number[] {
  let sum = 0
  for (const v of values) sum += v * v
  const norm = Math.sqrt(sum)
  if (!Number.isFinite(norm) || norm === 0) return values
  return values.map(v => v / norm)
}

/** Embeds a photo description as a retrieval query. Null on any failure. */
export async function embedQueryText(text: string): Promise<number[] | null> {
  const trimmed = text.trim().slice(0, 8_000)
  const key = process.env.GEMINI_API_KEY
  if (!trimmed || !key) return null

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), EMBEDDING_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: trimmed }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
        signal: ctrl.signal,
      }
    )
    if (!res.ok) {
      console.warn(`[semantic] embed ${res.status}`)
      return null
    }
    const data = (await res.json()) as { embedding?: { values?: unknown } }
    const values = data?.embedding?.values
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) return null
    const numbers = values.map((v: unknown) => Number(v))
    if (numbers.some((n: number) => !Number.isFinite(n))) return null
    return l2Normalize(numbers)
  } catch (err) {
    console.warn(`[semantic] embed failed: ${err instanceof Error ? err.message : String(err)}`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface SemanticItem {
  id: string
  business_id: string
  name: string
  price: number | null
  image_url: string | null
}

export interface SemanticHint {
  /** Businesses ordered by their best item's similarity, best first. */
  businessIds: string[]
  /** Best-matching item per business — what the result card shows. */
  items: Map<string, SemanticItem>
  topSimilarity: number
}

/**
 * Nearest shelf items to a photo description.
 *
 * Returns null when semantic search is unavailable (no key, migration missing),
 * which callers treat as "fall back to keywords" — different from an empty hit
 * list, which means the index exists but nothing is close enough.
 */
export async function semanticPhotoHint(
  text: string,
  options: { limit?: number; minSimilarity?: number } = {}
): Promise<SemanticHint | null> {
  const embedding = await embedQueryText(text)
  if (!embedding) return null

  const { data, error } = await getSupabase().rpc('match_business_items', {
    p_embedding: JSON.stringify(embedding),
    p_match_count: Math.min(Math.max(options.limit ?? 12, 1), 40),
    p_min_similarity: options.minSimilarity ?? SEMANTIC_MIN_SIMILARITY,
    p_category: null,
  })
  if (error) {
    // Missing function = migration 034 not applied on this project.
    console.warn(`[semantic] match failed: ${error.message}`)
    return null
  }

  const matches = (data as { id: string; similarity: number }[] | null) || []
  if (matches.length === 0) return { businessIds: [], items: new Map(), topSimilarity: 0 }

  // The RPC returns ids and scores only; the card needs the item itself.
  const ids = matches.map(m => m.id)
  const { data: rows } = await getSupabase()
    .from('business_items')
    .select('id, business_id, name, price, image_url')
    .in('id', ids)

  const byId = new Map(
    ((rows as SemanticItem[] | null) || []).map(r => [String(r.id), r])
  )

  const businessIds: string[] = []
  const items = new Map<string, SemanticItem>()
  for (const m of matches) {
    const item = byId.get(String(m.id))
    if (!item) continue
    const bizId = String(item.business_id)
    if (items.has(bizId)) continue // best item wins: matches are similarity-ordered
    items.set(bizId, item)
    businessIds.push(bizId)
  }

  return { businessIds, items, topSimilarity: matches[0]?.similarity ?? 0 }
}
