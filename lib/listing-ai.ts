import { callGemini } from '@wa-directory/shared'
import { getCached, setCached } from '@wa-directory/shared'
import {
  applyListingFields,
  type ListingFieldPatch,
  type ListingFormState,
} from './listing-intake.js'

// AI fallback for the listing intake: the rule-based parser handles clean
// messages for free; this pass only fires when it stalled or got confused
// (see needsAIPass). Gemini returns structured fields, then every value is
// re-validated through the same setters — the model can only propose, never
// bypass validation.

const AI_FIELDS = `{
  "name": "<business name, or empty>",
  "categories": ["<approved-style categories, e.g. Jewelry, Bakery, Plumbing>"],
  "city": "<Zimbabwe town/city, or 'whole country', or empty>",
  "area": "<suburb/area, or empty>",
  "phone": "<phone number, or empty>",
  "price_range": "<cheapest to most expensive, e.g. $5 - $40, or empty>",
  "website": "<website, or empty>",
  "catalog": "<WhatsApp catalog link (wa.me/c/…), or empty>",
  "address": "<street/stand number, or empty>",
  "description": "<one line of what the business sells, or empty>"
}`

function aiCacheKey(text: string): string {
  const norm = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return `listing_extract:${norm.slice(0, 160)}`
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 500) : ''
}

export async function aiPatchListing(
  text: string,
  current: ListingFormState,
  senderPhone: string
): Promise<ListingFormState> {
  if (!process.env.GEMINI_API_KEY) return current

  const key = aiCacheKey(text)
  const cached = await getCached<ListingFieldPatch>(key)
  let patch = cached

  if (!patch) {
    const known = Object.entries(current)
      .filter(([k, v]) => k !== 'logo' && (Array.isArray(v) ? v.length : !!v))
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ')
    const prompt = [
      'A Zimbabwe business owner is registering on a WhatsApp directory. From their message, extract business-listing fields.',
      known
        ? `Fields already filled (do not repeat unless the message changes them): ${known}`
        : 'No fields filled yet.',
      'Reply ONLY with a valid JSON object with exactly these keys:',
      AI_FIELDS,
      'Rules: empty string / empty array when the message does not contain the field.',
      'If a field appears with a label ("Name Diamond tradings", "Price 100- 200"), the label is not part of the value.',
      'Fix obvious typos in products/services (e.g. "diamong jewellery" → diamond jewellery) but never invent a business name.',
      'No markdown, no explanation.',
      '',
      `Message: "${text.slice(0, 800)}"`,
    ]
      .filter(Boolean)
      .join('\n')

    const raw = await callGemini(prompt)
    if (!raw) return current
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return current
    try {
      patch = JSON.parse(match[0]) as ListingFieldPatch
      await setCached(key, patch)
    } catch {
      return current
    }
  }

  // Filter the model's proposal down to sane values before validation.
  const clean: ListingFieldPatch = {}
  if (typeof patch.name === 'string' && !/^(?:business\s+)?name$/i.test(patch.name.trim())) {
    clean.name = patch.name
  }
  if (Array.isArray(patch.categories)) {
    clean.categories = patch.categories
      .filter((c): c is string => typeof c === 'string')
      .map(c => c.trim())
      .filter(Boolean)
      .slice(0, 4)
  }
  for (const k of ['city', 'area', 'phone', 'price_range', 'website', 'catalog', 'address', 'description'] as const) {
    const v = patch[k]
    if (typeof v === 'string' && v.trim()) clean[k] = v.trim()
  }
  if (patch.whole_country === true) clean.whole_country = true
  if (!Object.keys(clean).length) return current

  return applyListingFields(current, clean, senderPhone)
}
